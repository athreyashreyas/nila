'use client';

import { useState, useCallback } from 'react';
import { encryptJSON, decryptJSON } from '@/lib/encryption/core';
import { useEncryption } from '@/lib/encryption/context';
import { getSupabaseClient } from '@/lib/supabase/client';
import { cycleCache, type EncryptedRow } from '@/lib/data/decryptCache';
import { enqueue } from '@/lib/data/outbox';
import { saveSnapshotFromCaches } from '@/lib/data/snapshot';
import type { CyclePayload, DecryptedCycle } from '@/types/app';

// The signed-in user id, read from the local session (no network), so writes
// still work offline. Returns null only if the session is genuinely gone.
async function currentUserId(): Promise<string | null> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session?.user.id ?? null;
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
      const db = getSupabaseClient();
      const { data, error: dbError } = await db
        .from('cycles')
        .select('id, enc_data, enc_data_iv, created_at')
        .order('created_at', { ascending: false });
      if (dbError) throw dbError;

      // Reuse already-decrypted rows whose ciphertext hasn't changed; only decrypt
      // new or edited rows. Prune cache entries for rows that no longer exist.
      const rows = (data ?? []) as EncryptedRow[];
      const seen = new Set<string>();
      const decrypted = await Promise.all(
        rows.map(async (row) => {
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

  // Writes are optimistic: encrypt, update local state + the decrypt cache + the
  // snapshot right away, then hand the ciphertext to the durable outbox, which
  // syncs it to Supabase (retrying if offline). The UI never waits on the network.
  const addCycle = useCallback(async (payload: CyclePayload) => {
    const masterKey = getMasterKey();
    if (!masterKey) throw new Error('Encryption key not loaded.');
    const userId = await currentUserId();
    if (!userId) throw new Error('Not authenticated.');

    const id = crypto.randomUUID();
    const { enc_data, enc_data_iv } = await encryptJSON(payload, masterKey);
    const entry: DecryptedCycle = { id, payload, createdAt: new Date().toISOString() };

    cycleCache.set(id, { iv: enc_data_iv, entry });
    setCycles((prev) => [entry, ...prev].sort((a, b) => b.payload.periodStart.localeCompare(a.payload.periodStart)));
    void saveSnapshotFromCaches();

    await enqueue({ table: 'cycles', kind: 'upsert', rowId: id, row: { id, user_id: userId, enc_data, enc_data_iv } });
  }, [getMasterKey]);

  const updateCycle = useCallback(async (id: string, payload: CyclePayload) => {
    const masterKey = getMasterKey();
    if (!masterKey) throw new Error('Encryption key not loaded.');
    const userId = await currentUserId();
    if (!userId) throw new Error('Not authenticated.');

    const { enc_data, enc_data_iv } = await encryptJSON(payload, masterKey);
    const existing = cycleCache.get(id)?.entry;
    const entry: DecryptedCycle = { id, payload, createdAt: existing?.createdAt ?? new Date().toISOString() };

    cycleCache.set(id, { iv: enc_data_iv, entry });
    setCycles((prev) => prev.map((c) => (c.id === id ? entry : c)).sort((a, b) => b.payload.periodStart.localeCompare(a.payload.periodStart)));
    void saveSnapshotFromCaches();

    await enqueue({ table: 'cycles', kind: 'upsert', rowId: id, row: { id, user_id: userId, enc_data, enc_data_iv } });
  }, [getMasterKey]);

  const deleteCycle = useCallback(async (id: string) => {
    cycleCache.delete(id);
    setCycles((prev) => prev.filter((c) => c.id !== id));
    void saveSnapshotFromCaches();
    await enqueue({ table: 'cycles', kind: 'delete', rowId: id });
  }, []);

  // Seed state from a local snapshot for instant cold-load (before fetchAll).
  const hydrate = useCallback((entries: DecryptedCycle[]) => setCycles(entries), []);

  return { cycles, loading, error, fetchAll, hydrate, addCycle, updateCycle, deleteCycle };
}
