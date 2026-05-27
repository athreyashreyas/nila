'use client';

import { useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { encryptJSON, decryptJSON } from '@/lib/encryption/core';
import { useEncryption } from '@/lib/encryption/context';
import type { DailyLogPayload, DecryptedDailyLog } from '@/types/app';

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
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

      const decrypted = await Promise.all(
        (data ?? []).map(async (row) => ({
          id: row.id,
          payload: await decryptJSON<DailyLogPayload>(row.enc_data, row.enc_data_iv, masterKey),
          createdAt: row.created_at,
        }))
      );

      // Sort client-side by date descending
      decrypted.sort((a, b) => b.payload.date.localeCompare(a.payload.date));
      setLogs(decrypted);
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

    const { error: dbError } = await db.from('daily_logs').insert({ enc_data, enc_data_iv });
    if (dbError) throw dbError;
    await fetchAll();
  }, [getMasterKey, logs, fetchAll]);

  const deleteLog = useCallback(async (id: string) => {
    const db = supabase();
    const { error: dbError } = await db.from('daily_logs').delete().eq('id', id);
    if (dbError) throw dbError;
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return { logs, loading, error, fetchAll, getByDate, upsertLog, deleteLog };
}
