'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useEncryption } from '@/lib/encryption/context';
import { derivePasswordKey, unwrapMasterKey } from '@/lib/encryption/core';
import { loadKey, saveKey } from '@/lib/encryption/keyStore';
import { BottomNav } from '@/components/ui/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isUnlocked, mountKey } = useEncryption();
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tryRestoreKey = useCallback(async () => {
    try {
      const key = await loadKey();
      if (key) mountKey(key);
    } catch {
      // IndexedDB unavailable — will fall through to password form
    } finally {
      setChecking(false);
    }
  }, [mountKey]);

  useEffect(() => { tryRestoreKey(); }, [tryRestoreKey]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Session expired. Please sign in again.'); return; }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('key_salt, wrapped_key, pbkdf2_iterations')
        .eq('id', user.id)
        .single();
      if (profileError || !profile) throw new Error('Could not load your profile.');

      const pdk = await derivePasswordKey(password, profile.key_salt, profile.pbkdf2_iterations);
      const masterKey = await unwrapMasterKey(profile.wrapped_key, pdk);
      await saveKey(masterKey);
      mountKey(masterKey);
    } catch (err) {
      setError(
        err instanceof DOMException
          ? 'Incorrect password.'
          : err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="min-h-screen" />;
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold mb-1">Enter your password</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-foreground-muted)' }}>
            Re-enter your password to unlock your encrypted data.
          </p>
          <form onSubmit={handleUnlock} className="flex flex-col gap-4">
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-60"
              style={{ background: 'var(--color-accent)' }}
            >
              {loading ? 'Unlocking…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
