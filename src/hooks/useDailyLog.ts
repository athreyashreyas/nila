'use client';

import { useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { encryptJSON, decryptJSON } from '@/lib/encryption/core';
import { useEncryption } from '@/lib/encryption/context';
import { logCache, type EncryptedRow } from '@/lib/data/decryptCache';
import type { DailyLogPayload, DecryptedDailyLog } from '@/types/app';

// One browser client per tab, not a fresh one per call.
let _client: ReturnType<typeof createBrowserClient> | null = null;
function supabase() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
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
      const db = supabase();
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

  const upsertLog = useCallback(async (payload: DailyLogPayload) => {
    const masterKey = getMasterKey();
    if (!masterKey) throw new Error('Encryption key not loaded.');

    const { enc_data, enc_data_iv } = await encryptJSON(payload, masterKey);
    const db = supabase();

    // Delete any existing log for this date, then insert fresh
    // (date is inside the encrypted blob so we can't use a unique DB constraint)
    const existing = logs.find((l) => l.payload.date === payload.date);
    if (existing) {
      await db.from('daily_logs').delete().eq('id', existing.id);
    }

    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Not authenticated.');
    const { error: dbError } = await db.from('daily_logs').insert({ user_id: user.id, enc_data, enc_data_iv });
    if (dbError) throw dbError;
    await fetchAll();
  }, [getMasterKey, logs, fetchAll]);

  const deleteLog = useCallback(async (id: string) => {
    const db = supabase();
    const { error: dbError } = await db.from('daily_logs').delete().eq('id', id);
    if (dbError) throw dbError;
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Seed state from a local snapshot for instant cold-load (before fetchAll).
  const hydrate = useCallback((entries: DecryptedDailyLog[]) => setLogs(entries), []);

  return { logs, loading, error, fetchAll, hydrate, getByDate, upsertLog, deleteLog };
}
