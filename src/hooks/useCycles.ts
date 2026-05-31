'use client';

import { useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { encryptJSON, decryptJSON } from '@/lib/encryption/core';
import { useEncryption } from '@/lib/encryption/context';
import type { CyclePayload, DecryptedCycle } from '@/types/app';

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function useCycles() {
  const { getMasterKey } = useEncryption();
  const [cycles, setCycles] = useState<DecryptedCycle[]>([]);
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
        .from('cycles')
        .select('id, enc_data, enc_data_iv, created_at')
        .order('created_at', { ascending: false });
      if (dbError) throw dbError;

      const decrypted = await Promise.all(
        (data ?? []).map(async (row) => ({
          id: row.id,
          payload: await decryptJSON<CyclePayload>(row.enc_data, row.enc_data_iv, masterKey),
          createdAt: row.created_at,
        }))
      );

      // Sort client-side by periodStart descending (the only date we know after decryption)
      decrypted.sort((a, b) => b.payload.periodStart.localeCompare(a.payload.periodStart));
      setCycles(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cycles.');
    } finally {
      setLoading(false);
    }
  }, [getMasterKey]);

  const addCycle = useCallback(async (payload: CyclePayload) => {
    const masterKey = getMasterKey();
    if (!masterKey) throw new Error('Encryption key not loaded.');
    const { enc_data, enc_data_iv } = await encryptJSON(payload, masterKey);
    const db = supabase();
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Not authenticated.');
    const { error: dbError } = await db.from('cycles').insert({ user_id: user.id, enc_data, enc_data_iv });
    if (dbError) throw dbError;
    await fetchAll();
  }, [getMasterKey, fetchAll]);

  const updateCycle = useCallback(async (id: string, payload: CyclePayload) => {
    const masterKey = getMasterKey();
    if (!masterKey) throw new Error('Encryption key not loaded.');
    const { enc_data, enc_data_iv } = await encryptJSON(payload, masterKey);
    const db = supabase();
    const { error: dbError } = await db
      .from('cycles')
      .update({ enc_data, enc_data_iv })
      .eq('id', id);
    if (dbError) throw dbError;
    await fetchAll();
  }, [getMasterKey, fetchAll]);

  const deleteCycle = useCallback(async (id: string) => {
    const db = supabase();
    const { error: dbError } = await db.from('cycles').delete().eq('id', id);
    if (dbError) throw dbError;
    setCycles((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { cycles, loading, error, fetchAll, addCycle, updateCycle, deleteCycle };
}
