'use client';

import { useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { encryptJSON, decryptJSON } from '@/lib/encryption/core';
import { useEncryption } from '@/lib/encryption/context';
import { cycleCache, type EncryptedRow } from '@/lib/data/decryptCache';
import type { CyclePayload, DecryptedCycle } from '@/types/app';

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

      // Reuse already-decrypted rows whose ciphertext hasn't changed; only decrypt
      // new or edited rows. Prune cache entries for rows that no longer exist.
      const seen = new Set<string>();
      const decrypted = await Promise.all(
        (data ?? []).map(async (row: EncryptedRow) => {
          seen.add(row.id);
          const cached = cycleCache.get(row.id);
          if (cached && cached.iv === row.enc_data_iv) return cached.entry;
          const entry: DecryptedCycle = {
            id: row.id,
            payload: await decryptJSON<CyclePayload>(row.enc_data, row.enc_data_iv, masterKey),
            createdAt: row.created_at,
          };
          cycleCache.set(row.id, { iv: row.enc_data_iv, entry });
          return entry;
        })
      );
      for (const id of cycleCache.keys()) if (!seen.has(id)) cycleCache.delete(id);

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

  // Seed state from a local snapshot for instant cold-load (before fetchAll).
  const hydrate = useCallback((entries: DecryptedCycle[]) => setCycles(entries), []);

  return { cycles, loading, error, fetchAll, hydrate, addCycle, updateCycle, deleteCycle };
}
