'use client';

import { useState, useCallback } from 'react';
import { encryptJSON, decryptJSON } from '@/lib/encryption/core';
import { useEncryption } from '@/lib/encryption/context';
import { getSupabaseClient } from '@/lib/supabase/client';
import { logCache, type EncryptedRow } from '@/lib/data/decryptCache';
import { enqueue } from '@/lib/data/outbox';
import { saveSnapshotFromCaches } from '@/lib/data/snapshot';
import type { DailyLogPayload, DecryptedDailyLog } from '@/types/app';

// Signed-in user id from the local session (offline-safe, no network).
async function currentUserId(): Promise<string | null> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session?.user.id ?? null;
}

export function useDailyLog() {
  const { getMasterKey } = useEncryption();
  const [logs, setLogs] = useState<DecryptedDailyLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const masterKey = getMasterKey();
    if (!masterKey) return;
    setLoading(true);
    setError(null);
    try {
      const db = getSupabaseClient();
      const { data, error: dbError } = await db
        .from('daily_logs')
        .select('id, enc_data, enc_data_iv, created_at');
      if (dbError) throw dbError;

      // Reuse already-decrypted rows whose ciphertext hasn't changed; only decrypt
      // new or edited rows. Prune cache entries for rows that no longer exist.
      const seen = new Set<string>();
      const decrypted = await Promise.all(
        (data ?? []).map(async (row: EncryptedRow) => {
          seen.add(row.id);
          const cached = logCache.get(row.id);
          if (cached && cached.iv === row.enc_data_iv) return cached.entry;
          const entry: DecryptedDailyLog = {
            id: row.id,
            payload: await decryptJSON<DailyLogPayload>(row.enc_data, row.enc_data_iv, masterKey),
            createdAt: row.created_at,
          };
          logCache.set(row.id, { iv: row.enc_data_iv, entry });
          return entry;
        })
      );
      for (const id of logCache.keys()) if (!seen.has(id)) logCache.delete(id);

      // Collapse duplicate entries for the same date. Because the date lives inside the
      // encrypted blob we can't enforce a unique DB constraint, so two devices logging
      // the same day before syncing can create duplicate rows. Keep the most recently
      // created one, drop the rest from local state, and delete the stale rows so they
      // don't linger. This self-heals on every fetch.
      const byDate = new Map<string, DecryptedDailyLog>();
      const duplicateIds: string[] = [];
      for (const entry of decrypted) {
        const existing = byDate.get(entry.payload.date);
        if (!existing) {
          byDate.set(entry.payload.date, entry);
        } else {
          const keep = entry.createdAt > existing.createdAt ? entry : existing;
          const drop = entry.createdAt > existing.createdAt ? existing : entry;
          byDate.set(entry.payload.date, keep);
          duplicateIds.push(drop.id);
        }
      }

      const deduped = [...byDate.values()].sort((a, b) => b.payload.date.localeCompare(a.payload.date));
      setLogs(deduped);

      if (duplicateIds.length > 0) {
        void db.from('daily_logs').delete().in('id', duplicateIds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }, [getMasterKey]);

  const getByDate = useCallback(
    (date: string): DecryptedDailyLog | undefined => {
      return logs.find((l) => l.payload.date === date);
    },
    [logs]
  );

  // Optimistic upsert. There is one row per date, kept by reusing the existing
  // row's id (the date lives inside the encrypted blob, so this is how we hold
  // the one-per-date invariant without a DB constraint, and it avoids the
  // duplicate rows the old delete-then-insert could create across devices).
  const upsertLog = useCallback(async (payload: DailyLogPayload) => {
    const masterKey = getMasterKey();
    if (!masterKey) throw new Error('Encryption key not loaded.');
    const userId = await currentUserId();
    if (!userId) throw new Error('Not authenticated.');

    const existing = logs.find((l) => l.payload.date === payload.date);
    const id = existing?.id ?? crypto.randomUUID();
    const { enc_data, enc_data_iv } = await encryptJSON(payload, masterKey);
    const entry: DecryptedDailyLog = { id, payload, createdAt: existing?.createdAt ?? new Date().toISOString() };

    logCache.set(id, { iv: enc_data_iv, entry });
    setLogs((prev) => {
      const rest = prev.filter((l) => l.payload.date !== payload.date);
      return [...rest, entry].sort((a, b) => b.payload.date.localeCompare(a.payload.date));
    });
    void saveSnapshotFromCaches();

    await enqueue({ table: 'daily_logs', kind: 'upsert', rowId: id, row: { id, user_id: userId, enc_data, enc_data_iv } });
  }, [getMasterKey, logs]);

  const deleteLog = useCallback(async (id: string) => {
    logCache.delete(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    void saveSnapshotFromCaches();
    await enqueue({ table: 'daily_logs', kind: 'delete', rowId: id });
  }, []);

  // Seed state from a local snapshot for instant cold-load (before fetchAll).
  const hydrate = useCallback((entries: DecryptedDailyLog[]) => setLogs(entries), []);

  return { logs, loading, error, fetchAll, hydrate, getByDate, upsertLog, deleteLog };
}
