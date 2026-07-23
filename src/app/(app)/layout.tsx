'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEncryption } from '@/lib/encryption/context';
import { derivePasswordKey, unwrapMasterKey } from '@/lib/encryption/core';
import { loadKey, saveKey } from '@/lib/encryption/keyStore';
import { BottomNav } from '@/components/ui/BottomNav';
import { SyncDot } from '@/components/ui/SyncDot';
import { AppDataProvider, useAppData } from '@/lib/data/context';
import { useTheme } from '@/lib/theme/context';
import { isThemeId } from '@/lib/theme/themes';
import { APP_VERSION } from '@/lib/version';
import { claimUnseenVersion, markVersionSeen } from '@/lib/whatsNew';

const QUOTES = [
  'Your body keeps its own rhythm.',
  'Every cycle is a new beginning.',
  'Rest is a form of strength.',
  'You know yourself better than anyone.',
  'Strong, cyclical, whole.',
  'Your story is safe here.',
  'Tuning into your inner cycles…',
  'Good things take just a moment.',
  'You are exactly where you need to be.',
  'Softness is its own kind of strength.',
  'Your body is wise. Listen gently.',
  'Every phase has its own quiet gift.',
  'Here for you, every day of the month.',
  'You deserve tenderness, especially from yourself.',
  'Breathe. This moment is yours.',
  'Honouring your rhythm, one day at a time.',
  'You are whole in every season.',
  'Small check-ins, deep self-knowledge.',
  'Be as kind to yourself as you are to others.',
  'A little gentleness goes a long way today.',
  'Trust yourself. You know your body.',
  'Your cycle is a story only you can tell.',
];

function LoadingScreen() {
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    const id = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: 'var(--color-background)' }}>
      <motion.div
        animate={{ scale: [1, 1.04, 1], opacity: [0.9, 1, 0.9] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-2xl overflow-hidden select-none"
        style={{ background: '#fdfcf9', boxShadow: 'var(--shadow-card)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dancer.png" alt="" className="w-full h-full object-cover" />
      </motion.div>
      <div className="font-display text-2xl tracking-tight" style={{ color: 'var(--color-foreground)' }}>Nila</div>
      <AnimatePresence mode="wait">
        <motion.p
          key={quoteIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-sm text-center max-w-[200px] leading-relaxed"
          style={{ color: 'var(--color-foreground-muted)' }}>
          {QUOTES[quoteIdx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ─── Scrolling main container ─────────────────────────────────

// Plain scroller. Refresh is on demand now, via the sync dot, so there's no
// pull-to-refresh gesture to get in the way of normal scrolling.
function ScrollMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The guide is a full screen you step into, so it carries its own header and
  // its own way back out. No sync dot over it.
  const chrome = !pathname.startsWith('/guide');
  return (
    <main className="scroll-ios relative flex-1 min-h-0 overflow-y-auto overscroll-none">
      {/* Sync status dot: absolute to this scroll area's top-right, aligned with the
          page header and scrolling with the page rather than floating over it. */}
      {chrome && <SyncDot />}
      {children}
    </main>
  );
}

// ─── First-run and update decisions ───────────────────────────

// Once per mount, and at most once per version: a user who has just finished
// onboarding is walked through the guide, and a returning user who opens a
// version they have not met yet is shown What's new. `claimUnseenVersion` marks
// the version seen (on this device and on the account) at the moment it answers,
// so a plain reopen never re-triggers either, and neither does opening the app
// on a second device once it has been read on the first.
//
// APP_VERSION is baked into the bundle, so "the version changed" and "a fresh
// bundle loaded" are the same moment: a cold open, or the reload that follows
// picking up a new version from the sync sheet. Both land here.
function GuideBoot() {
  const router = useRouter();
  const pathname = usePathname();
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;
    // Already on the guide (onboarding sent them straight here): nothing to do
    // but make sure this version does not greet them again later.
    if (pathname.startsWith('/guide')) {
      markVersionSeen(APP_VERSION);
      return;
    }
    // The claim waits on the network, and a brand-new account can be redirected
    // to onboarding while it is in flight. Only navigate if this is still the
    // mounted shell, so a late answer never yanks anyone out of setup.
    let alive = true;
    void (async () => {
      const unseen = await claimUnseenVersion(APP_VERSION);
      if (alive && unseen) router.replace('/guide?pane=new');
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ─── Cross-device theme sync ──────────────────────────────────

function ThemeSync() {
  const { theme, setTheme } = useTheme();
  const isFirstRender = useRef(true);

  // On mount: read Supabase preference and apply (cross-device sync)
  useEffect(() => {
    async function load() {
      const db = getSupabaseClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      const { data } = await db.from('profiles').select('preferences').eq('id', user.id).single();
      const t = (data?.preferences as Record<string, string> | null)?.theme;
      if (isThemeId(t)) {
        setTheme(t);
      }
    }
    load().catch(() => {}); // silently fails if preferences column not yet migrated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On theme change: persist to Supabase
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    async function save() {
      const db = getSupabaseClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      const { data } = await db.from('profiles').select('preferences').eq('id', user.id).single();
      const existing = (data?.preferences as object | null) ?? {};
      await db.from('profiles').update({ preferences: { ...existing, theme } }).eq('id', user.id);
    }
    save().catch(() => {});
  }, [theme]);

  return null;
}

// ─── Auth gate ────────────────────────────────────────────────

function DataGate({ children }: { children: React.ReactNode }) {
  const { isReady } = useAppData();
  if (isReady) return <>{children}</>;
  return <LoadingScreen />;
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
        try {
          if (!localStorage.getItem('nila-onboarded')) {
            const db = getSupabaseClient();
            const { count } = await db.from('cycles').select('*', { count: 'exact', head: true });
            if (count && count > 0) {
              localStorage.setItem('nila-onboarded', 'true');
            } else {
              router.replace('/onboarding');
              return;
            }
          }
        } catch {}
      }
    } catch {}
    setChecking(false);
  }, [mountKey, router]);

  useEffect(() => { tryRestoreKey(); }, [tryRestoreKey]);

  useEffect(() => {
    if (isUnlocked) TAB_ROUTES.forEach(route => router.prefetch(route));
  }, [isUnlocked, router]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
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

      try {
        if (!localStorage.getItem('nila-onboarded')) {
          const { count } = await supabase.from('cycles').select('*', { count: 'exact', head: true });
          if (count && count > 0) {
            localStorage.setItem('nila-onboarded', 'true');
          } else {
            router.replace('/onboarding');
            return;
          }
        }
      } catch {}
    } catch (err) {
      setError(
        err instanceof DOMException ? 'Incorrect password.'
          : err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <LoadingScreen />;

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
              style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-border)', color: 'var(--color-foreground)' }}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading || !password}
              className="w-full py-3 rounded-full text-sm font-medium disabled:opacity-60"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
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
        <ThemeSync />
        <GuideBoot />
        {/* Shell fills the html element's height (see globals.css), which is the true
            full-screen height and shrinks with the keyboard. The nav is a normal flex
            child at the bottom (not position:fixed), so the keyboard overlays it. */}
        <div className="flex flex-col h-full overflow-hidden"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <ScrollMain>
            {children}
          </ScrollMain>
          <BottomNav />
        </div>
      </DataGate>
    </AppDataProvider>
  );
}
