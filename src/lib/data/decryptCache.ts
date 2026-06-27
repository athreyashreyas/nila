'use client';

// In-memory cache of already-decrypted rows, keyed by row id. The stored `iv`
// lets us detect when a row's ciphertext changed (every re-encrypt uses a fresh
// IV), so an unchanged row is reused verbatim instead of being decrypted again.
//
// Why this matters: cycles and daily_logs are re-fetched on unlock, app
// foreground, realtime change, and pull-to-refresh. Without this cache every one
// of those decrypts ALL rows on the main thread, which gets slow after many days
// of logs. With it, a refetch with no changes does zero decryption.
//
// This holds plaintext health data in memory only (never persisted, never sent
// anywhere). It is cleared whenever the master key is cleared (sign out / lock).

import type { DecryptedCycle, DecryptedDailyLog } from '@/types/app';

// Shape of an encrypted row as fetched from Supabase (the browser client is
// untyped, so we annotate it ourselves rather than relying on inference).
export interface EncryptedRow {
  id: string;
  enc_data: string;
  enc_data_iv: string;
  created_at: string;
}

export const cycleCache = new Map<string, { iv: string; entry: DecryptedCycle }>();
export const logCache = new Map<string, { iv: string; entry: DecryptedDailyLog }>();

export function clearDecryptCaches(): void {
  cycleCache.clear();
  logCache.clear();
}
