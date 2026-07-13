'use client';

// The durable write outbox. Every health-data write is queued here first, then
// drained to Supabase in order. A write made offline, or one that fails, stays
// queued and is retried on reconnect, on tab focus, and after each successful
// flush, so a log is never lost to a dropped connection.
//
// E2EE note: the queue stores ONLY ciphertext (enc_data + enc_data_iv) plus ids.
// Encryption already happened in the data hook before enqueue, so no plaintext
// health data ever lands in this store, and flushing needs no master key.

import { getSupabaseClient } from '@/lib/supabase/client';
import { syncStatus, withPending } from '@/lib/sync/status';

export type OutboxTable = 'cycles' | 'daily_logs';

interface EncRow {
  id: string;
  user_id: string;
  enc_data: string;
  enc_data_iv: string;
}

export interface OutboxOp {
  id?: number; // autoincrement key, assigned by IndexedDB
  table: OutboxTable;
  kind: 'upsert' | 'delete';
  rowId: string;
  row?: EncRow; // present for upsert
  ts: number;
  attempts: number;
}

const DB_NAME = 'nila-outbox';
const STORE = 'ops';
const MAX_ATTEMPTS = 10;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function allOps(): Promise<OutboxOp[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as OutboxOp[]).sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
    req.onerror = () => reject(req.error);
  });
}

async function putOp(op: OutboxOp): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(op);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteOp(id: number): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function countOps(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function refreshQueuedCount(): Promise<void> {
  try {
    syncStatus.setQueued(await countOps());
  } catch {
    /* ignore */
  }
}

let flushing = false;

// Send one op to Supabase. Throws on network failure so the caller can stop and
// retry the whole queue later; resolves on success (and on idempotent no-ops).
async function sendOp(op: OutboxOp): Promise<void> {
  const db = getSupabaseClient();
  if (op.kind === 'delete') {
    const { error } = await db.from(op.table).delete().eq('id', op.rowId);
    if (error) throw error;
    return;
  }
  // upsert: idempotent on the primary key, so retries after a partial success
  // never create a duplicate or a duplicate-key error.
  const { error } = await db.from(op.table).upsert(op.row!, { onConflict: 'id' });
  if (error) throw error;
}

// Drain the queue in FIFO order. Stops at the first op that fails (almost always
// offline) and leaves it and everything after it queued. Only an op the server
// actively rejected counts toward MAX_ATTEMPTS — a network failure retries
// forever, because dropping a write that never reached the server would lose
// data the server has no copy of. A PostgrestError (server reached, request
// rejected) carries a `code`; a bare network throw does not.
export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  flushing = true;
  try {
    const ops = await allOps();
    for (const op of ops) {
      try {
        await withPending(() => sendOp(op));
        if (op.id != null) await deleteOp(op.id);
      } catch (err) {
        const serverRejected = typeof (err as { code?: unknown })?.code === 'string';
        if (!serverRejected) break; // offline / flaky network: retry later, untouched
        // Bump attempts; drop a poison op after MAX_ATTEMPTS so it can never
        // wedge the queue forever, otherwise stop and retry next flush.
        const next = { ...op, attempts: op.attempts + 1 };
        if (next.attempts >= MAX_ATTEMPTS && op.id != null) {
          console.warn('Outbox op rejected by server too many times, dropping.', op.table, op.kind, op.rowId);
          await deleteOp(op.id);
          continue;
        }
        if (op.id != null) await putOp(next);
        break;
      }
    }
  } finally {
    flushing = false;
    await refreshQueuedCount();
  }
}

// Queue a write and try to send it right away. The optimistic UI update and the
// local snapshot have already happened in the hook, so this is fire-and-forget.
export async function enqueue(op: Omit<OutboxOp, 'ts' | 'attempts'>): Promise<void> {
  await putOp({ ...op, ts: Date.now(), attempts: 0 });
  await refreshQueuedCount();
  void flushOutbox();
}

let inited = false;
export function initOutbox(): void {
  if (inited || typeof window === 'undefined') return;
  inited = true;
  window.addEventListener('online', () => void flushOutbox());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushOutbox();
  });
  void refreshQueuedCount();
  void flushOutbox();
}
