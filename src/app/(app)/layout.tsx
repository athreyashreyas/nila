'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { useEncryption } from '@/lib/encryption/context';
import { derivePasswordKey, unwrapMasterKey } from '@/lib/encryption/core';
import { loadKey, saveKey } from '@/lib/encryption/keyStore';
import { BottomNav } from '@/components/ui/BottomNav';
import { AppDataProvider, useAppData } from '@/lib/data/context';

const QUOTES = [
  'Your body keeps its own rhythm.',
  'Every cycle is a new beginning.',
  'Rest is a form of strength.',
  'You know yourself better than anyone.',
  'Strong, cyclical, whole.',
  'Your story is safe here.',
  'Tuning into your inner cycles…',
  'Good things take just a moment.',
];

function DataGate({ children }: { children: React.ReactNode }) {
  const { isReady } = useAppData();
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    if (isReady) return;
    const id = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 2800);
    return () => clearInterval(id);
  }, [isReady]);

  if (isReady) return <>{children}</>;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: 'var(--color-background)' }}
    >
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.9, 1, 0.9] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        className="text-5xl select-none"
      >
        🌕
      </motion.div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
        Nila
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={quoteIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-sm text-center max-w-[200px] leading-relaxed"
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          {QUOTES[quoteIdx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

const TAB_ROUTES = ['/home', '/calendar', '/insights', '/settings', '/journal'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isUnlocked, mountKey } = useEncryption();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tryRestoreKey = useCallback(async () => {
    try {
      const key = await loadKey();
      if (key) {
        mountKey(key);
        // Check onboarding flag — redirect if this user hasn't gone through it yet
        try {
          if (!localStorage.getItem('nila-onboarded')) {
            router.replace('/onboarding');
            return; // keep checking=true — blank screen while navigating
          }
        } catch {}
      }
    } catch {
      // IndexedDB unavailable — fall through to password form
    }
    setChecking(false);
  }, [mountKey, router]);

  useEffect(() => { tryRestoreKey(); }, [tryRestoreKey]);

  // Prefetch all tabs once unlocked so first switch is instant
  useEffect(() => {
    if (isUnlocked) {
      TAB_ROUTES.forEach((route) => router.prefetch(route));
    }
  }, [isUnlocked, router]);

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

      // Check onboarding after manual unlock too
      try {
        if (!localStorage.getItem('nila-onboarded')) {
          router.replace('/onboarding');
          return;
        }
      } catch {}
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
    return <div className="min-h-screen" style={{ background: 'var(--color-background)' }} />;
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5"
        style={{ background: 'var(--color-background)' }}>
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
            Enter your password
          </h1>
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
    <AppDataProvider>
      <DataGate>
        <div className="flex flex-col min-h-screen">
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
          <BottomNav />
        </div>
      </DataGate>
    </AppDataProvider>
  );
}
