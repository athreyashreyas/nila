'use client';

// Local-first snapshot of the user's already-decrypted data, persisted in
// IndexedDB. On a cold reload we hydrate the UI from this instantly (no network,
// no decryption), then reconcile from the server in the background. It also
// restores the in-memory decrypt caches, so that background reconcile re-decrypts
// only rows that actually changed.
//
// This is plaintext-at-rest on the device only. It is never sent anywhere, and is
// cleared on sign out / lock alongside the key. The device already stores the raw
// master key in IndexedDB, so this does not widen the local threat model.

import { cycleCache, logCache } from '@/lib/data/decryptCache';
import type { DecryptedCycle, DecryptedDailyLog } from '@/types/app';

const DB_NAME = 'nila-cache';
const STORE = 'snap';
const KEY = 'data';

interface CachedRow<T> { id: string; iv: string; entry: T }
interface SnapshotShape {
  cycles: CachedRow<DecryptedCycle>[];
  logs: CachedRow<DecryptedDailyLog>[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Serialise the current decrypt caches (which carry id + iv + decrypted entry).
export async function saveSnapshotFromCaches(): Promise<void> {
  try {
    const snap: SnapshotShape = {
      cycles: [...cycleCache.entries()].map(([id, v]) => ({ id, iv: v.iv, entry: v.entry })),
      logs: [...logCache.entries()].map(([id, v]) => ({ id, iv: v.iv, entry: v.entry })),
    };
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(snap, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Best-effort cache; a failure here must never affect the app.
  }
}

// Load the snapshot, repopulate the in-memory decrypt caches, and return the
// decrypted rows ready to seed React state (sorted the same way the hooks sort).
export async function restoreSnapshot(): Promise<{
  cycles: DecryptedCycle[];
  logs: DecryptedDailyLog[];
} | null> {
  try {
    const db = await openDB();
    const snap = await new Promise<SnapshotShape | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!snap || (snap.cycles.length === 0 && snap.logs.length === 0)) return null;

    for (const r of snap.cycles) cycleCache.set(r.id, { iv: r.iv, entry: r.entry });
    for (const r of snap.logs) logCache.set(r.id, { iv: r.iv, entry: r.entry });

    const cycles = snap.cycles
      .map((r) => r.entry)
      .sort((a, b) => b.payload.periodStart.localeCompare(a.payload.periodStart));

    // Dedup logs by date (keep newest) so a stale duplicate in the cache doesn't
    // flash on cold load; the background sync reconciles the rest.
    const byDate = new Map<string, DecryptedDailyLog>();
    for (const r of snap.logs) {
      const existing = byDate.get(r.entry.payload.date);
      if (!existing || r.entry.createdAt > existing.createdAt) byDate.set(r.entry.payload.date, r.entry);
    }
    const logs = [...byDate.values()].sort((a, b) => b.payload.date.localeCompare(a.payload.date));

    return { cycles, logs };
  } catch {
    return null;
  }
}

export async function clearSnapshot(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
