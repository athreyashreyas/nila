'use client';

// Messages waiting to reach the creator.
//
// Nila is local-first about everything somebody writes into it, and a message
// written in Settings is treated the same way: it is stored on the device first
// and delivered when there is a connection. Somebody on a train can write what
// went wrong, close the app, and never think about it again.
//
// Its own small IndexedDB store rather than a row in the write outbox: that
// queue carries ciphertext rows bound for Postgres tables, and a message
// belongs to no table, is not encrypted (a person has to read it), and goes to
// an edge function instead. Mixing the two would blur the one rule the write
// outbox exists to keep.

import { getSupabaseClient } from '@/lib/supabase/client';
import type { FeedbackKind } from '@/lib/feedback';

export interface FeedbackOp {
  id?: number; // autoincrement key, assigned by IndexedDB
  kind: FeedbackKind;
  subject: string;
  body: string;
  ts: number;
  attempts: number;
}

const DB_NAME = 'nila-feedback';
const STORE = 'messages';

/** Attempts before a message is given up on, so a queue cannot grow forever. */
const MAX_ATTEMPTS = 8;

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

async function allOps(): Promise<FeedbackOp[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve((req.result as FeedbackOp[]).sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
    req.onerror = () => reject(req.error);
  });
}

async function putOp(op: FeedbackOp): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(op);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function addOp(op: FeedbackOp): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(op);
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

export async function pendingFeedbackCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Hands one message to the relay. Throws when it did not get through. */
async function relay(op: FeedbackOp): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.functions.invoke('feedback', {
    body: { kind: op.kind, subject: op.subject, body: op.body },
  });
  if (error) throw error;
}

/**
 * Tries to send now, and keeps the message if it cannot. Returns how it went, so
 * the sheet can tell the truth about which of the three happened.
 *
 * 'failed' is the one the sheet must not paper over: the device would not even
 * store the message, so promising it will go later would be a lie.
 */
export async function sendOrQueueFeedback(
  kind: FeedbackKind,
  subject: string,
  body: string
): Promise<'sent' | 'queued' | 'failed'> {
  const op: FeedbackOp = { kind, subject, body, ts: Date.now(), attempts: 0 };

  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      await relay(op);
      return 'sent';
    } catch {
      // Fall through: it is worth keeping rather than worth losing.
    }
  }

  try {
    await addOp({ ...op, attempts: 1 });
    return 'queued';
  } catch {
    // Storage full, or the database blocked by another tab. Nothing has been
    // kept, so say so rather than showing the "it will send itself" note.
    return 'failed';
  }
}

let flushing = false;

/**
 * Sends everything waiting, oldest first. Safe to call often: it does nothing
 * offline, nothing while signed out, and never runs twice at once.
 */
export async function flushFeedbackOutbox(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  flushing = true;
  try {
    // The relay stamps the sender from their session, so there is nobody to
    // attribute a message to until somebody is signed in.
    const { data } = await getSupabaseClient().auth.getSession();
    if (!data.session) return;

    for (const op of await allOps()) {
      try {
        await relay(op);
        if (op.id != null) await deleteOp(op.id);
      } catch {
        const attempts = op.attempts + 1;
        if (attempts >= MAX_ATTEMPTS && op.id != null) {
          console.warn('Giving up on a queued message after', attempts, 'tries.');
          await deleteOp(op.id);
        } else {
          await putOp({ ...op, attempts });
        }
        // One failure usually means the next will fail too, so stop here and let
        // the next reconnect try again rather than burning the attempts.
        break;
      }
    }
  } catch {
    // Best effort, and fired from event listeners that cannot await it. A
    // failure here means the queue is untouched and the next reconnect or
    // foreground will try again, so there is nothing to report and nothing to
    // leave as an unhandled rejection.
  } finally {
    flushing = false;
  }
}

/**
 * Watches for a chance to send. Coming back online is the obvious one; coming
 * back to the app covers the case where the connection returned while it was
 * closed and no event was ever heard.
 */
export function startFeedbackOutbox(): () => void {
  const attempt = () => void flushFeedbackOutbox();
  const onVisible = () => {
    if (document.visibilityState === 'visible') attempt();
  };

  window.addEventListener('online', attempt);
  document.addEventListener('visibilitychange', onVisible);
  attempt();

  return () => {
    window.removeEventListener('online', attempt);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
