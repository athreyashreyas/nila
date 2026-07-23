'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useEncryption } from '@/lib/encryption/context';
import { useTheme } from '@/lib/theme/context';
import { THEMES } from '@/lib/theme/themes';
import { derivePasswordKey, unwrapMasterKey, wrapMasterKey, generateSalt } from '@/lib/encryption/core';
import { useAppData } from '@/lib/data/context';
import { getSupabaseClient } from '@/lib/supabase/client';
import { clearKey as clearIDBKey } from '@/lib/encryption/keyStore';
import { registerPushSubscription, unregisterPushSubscription, isPushSupported } from '@/lib/push/register';
import { InstallPrompt } from '@/components/ui/InstallPrompt';
import { LockIcon } from '@/components/ui/icons';
import { APP_VERSION } from '@/lib/version';

// A friendly name for the current device, used when saving a push subscription
// so a user can tell their devices apart.
function deviceLabel(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'This device';
}

// A calm in-app hour stepper (no OS time wheel). Whole hours, wrapping 0..23.
function HourPicker({ label, value, onChange }: { label: string; value: number; onChange: (h: number) => void }) {
  const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return (
    <div className="flex-1">
      <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--color-foreground-muted)' }}>{label}</p>
      <div className="flex items-center justify-between rounded-[var(--radius-sm)] px-2 py-2"
        style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-border)' }}>
        <button type="button" aria-label="Earlier" onClick={() => onChange((value + 23) % 24)}
          className="w-7 h-7 rounded-full flex items-center justify-center" style={{ color: 'var(--color-foreground)' }}>‹</button>
        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-foreground)' }}>{fmt(value)}</span>
        <button type="button" aria-label="Later" onClick={() => onChange((value + 1) % 24)}
          className="w-7 h-7 rounded-full flex items-center justify-center" style={{ color: 'var(--color-foreground)' }}>›</button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { clearKey } = useEncryption();
  const { theme, setTheme } = useTheme();
  const { cycles, logs } = useAppData();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showDevReset, setShowDevReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Notification preferences (quiet hours + evening round-up), stored in the
  // profile so they follow the user across devices and are enforced by the push
  // sender. Times are whole hours in the device's local time.
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(7);
  const [roundup, setRoundup] = useState(false);
  const notifLoaded = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub))
      );
    }
  }, []);

  // Load notification prefs once.
  useEffect(() => {
    (async () => {
      try {
        const db = getSupabaseClient();
        const { data: { user } } = await db.auth.getUser();
        if (!user) return;
        const { data } = await db.from('profiles').select('preferences').eq('id', user.id).single();
        const n = (data?.preferences as Record<string, unknown> | null)?.notifications as
          | { quietHours?: { enabled?: boolean; start?: number; end?: number }; roundup?: boolean }
          | undefined;
        if (n?.quietHours) {
          setQuietEnabled(!!n.quietHours.enabled);
          if (typeof n.quietHours.start === 'number') setQuietStart(n.quietHours.start);
          if (typeof n.quietHours.end === 'number') setQuietEnd(n.quietHours.end);
        }
        if (typeof n?.roundup === 'boolean') setRoundup(n.roundup);
      } catch {} finally {
        notifLoaded.current = true;
      }
    })();
  }, []);

  // Persist prefs whenever they change (after the initial load), merged into the
  // profile's preferences alongside timezone so the sender can honour local time.
  useEffect(() => {
    if (!notifLoaded.current) return;
    (async () => {
      try {
        const db = getSupabaseClient();
        const { data: { user } } = await db.auth.getUser();
        if (!user) return;
        const { data } = await db.from('profiles').select('preferences').eq('id', user.id).single();
        const existing = (data?.preferences as object | null) ?? {};
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await db.from('profiles').update({
          preferences: {
            ...existing,
            timezone,
            notifications: { quietHours: { enabled: quietEnabled, start: quietStart, end: quietEnd }, roundup },
          },
        }).eq('id', user.id);
      } catch {}
    })();
  }, [quietEnabled, quietStart, quietEnd, roundup]);

  async function handlePushToggle() {
    setPushLoading(true);
    try {
      const db = getSupabaseClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;

      if (pushEnabled) {
        await unregisterPushSubscription();
        await db.from('push_subscriptions').delete().eq('user_id', user.id);
        setPushEnabled(false);
      } else {
        const sub = await registerPushSubscription();
        if (sub) {
          await db.from('push_subscriptions').upsert({
            user_id: user.id,
            subscription: sub.toJSON(),
            device_name: deviceLabel(),
          });
          setPushEnabled(true);
        }
      }
    } finally {
      setPushLoading(false);
    }
  }

  async function handleSignOut() {
    clearKey();
    await clearIDBKey();
    await getSupabaseClient().auth.signOut();
    router.push('/login');
  }

  function handleVersionTap() {
    setTapCount(n => {
      const next = n + 1;
      if (next >= 5) { setShowDevReset(true); return 0; }
      return next;
    });
  }

  async function handleDevReset() {
    setResetting(true);
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('nila') || k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k));
      await indexedDB.databases?.().then(dbs =>
        Promise.all(dbs.map(db => db.name && indexedDB.deleteDatabase(db.name)))
      ).catch(() => indexedDB.deleteDatabase('nila-ks'));
      clearKey();
      await getSupabaseClient().auth.signOut();
      router.replace('/login');
    } finally {
      setResetting(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    setPwLoading(true);
    setPwError('');
    try {
      const db = getSupabaseClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error('Not signed in.');

      const { data: profile } = await db
        .from('profiles')
        .select('pbkdf2_iterations, key_salt, wrapped_key')
        .single();
      if (!profile) throw new Error('Profile not found.');
      const iterations = profile.pbkdf2_iterations ?? 600_000;

      // Unwrap the master key from the server blob with the OLD password. This
      // both verifies the old password and yields an extractable key — the
      // in-memory session key (restored from the key store on a cold reload) is
      // non-extractable by design and cannot be re-wrapped.
      let masterKey: CryptoKey;
      try {
        const oldPdk = await derivePasswordKey(oldPassword, profile.key_salt, iterations);
        masterKey = await unwrapMasterKey(profile.wrapped_key, oldPdk);
      } catch {
        setPwError('Current password is incorrect.');
        return;
      }

      const newSalt = generateSalt();
      const newPdk = await derivePasswordKey(newPassword, newSalt, iterations);
      const newWrappedKey = await wrapMasterKey(masterKey, newPdk);

      const { error: pwError } = await db.auth.updateUser({ password: newPassword });
      if (pwError) throw pwError;

      await db.from('profiles').update({ key_salt: newSalt, wrapped_key: newWrappedKey }).eq('id', user.id);

      setPwSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setShowChangePassword(false);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPwLoading(false);
    }
  }

  function handleExport() {
    const data = {
      exported_at: new Date().toISOString(),
      cycles: cycles.map(c => c.payload),
      daily_logs: logs.map(l => l.payload),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nila-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // The name the user gave at onboarding, shown on the profile row.
  const userName = (() => {
    try { return (JSON.parse(localStorage.getItem('nila-prefs') ?? '{}').name as string | null) || null; }
    catch { return null; }
  })();

  const Row = ({ label, sub, onClick, accent = false }: { label: string; sub?: string; onClick: () => void; accent?: boolean }) => (
    <button onClick={onClick} className="flex items-center justify-between w-full px-4 py-3.5 rounded-[var(--radius)] transition-all"
      style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
      <div className="text-left">
        <div className="text-sm font-medium" style={{ color: accent ? 'var(--color-accent)' : undefined }}>{label}</div>
        {sub && <div className="text-xs mt-0.5 opacity-50">{sub}</div>}
      </div>
      <span className="opacity-30 text-base">›</span>
    </button>
  );

  return (
    <div className="px-5 pt-4 pb-28">
      {/* pr-10 leaves the top-right corner clear for the sync dot. */}
      <h1 className="font-display text-[26px] pt-1 mb-4 pr-10">Settings</h1>

      <div className="flex flex-col gap-3">
        {/* Who this is. The dancer sits on a light tile, never blended. */}
        <div className="flex items-center gap-3.5 rounded-[var(--radius)] p-4"
          style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
          {/* A light tile under the dancer, fixed rather than themed: the PNG has a
              cream ground, so it needs paper beneath it on dark palettes too. */}
          <span className="w-12 h-12 rounded-[14px] overflow-hidden flex-shrink-0"
            style={{ background: '#fdfcf9' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/dancer.png" alt="" className="w-full h-full object-cover" />
          </span>
          <div className="min-w-0">
            <div className="font-display text-lg leading-tight">{userName ?? 'Nila'}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-foreground-muted)' }}>
              {cycles.length} cycles, {logs.length} entries
            </div>
          </div>
        </div>

        {/* The app's soul, near the top where it belongs. */}
        <div className="rounded-[var(--radius)] p-4 flex gap-3.5"
          style={{ background: 'var(--color-accent-soft)' }}>
          <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }}>
            <LockIcon size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Zero-knowledge encryption</p>
            <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--color-foreground-muted)' }}>
              Everything you log is encrypted on this device before it leaves. Nila's servers hold only
              unreadable bytes, so your dates, symptoms, and notes stay yours alone.
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: 'var(--color-foreground-muted)' }}>Appearance</p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="flex flex-col items-center gap-2 py-3 rounded-[var(--radius-sm)] transition-all"
                  style={{
                    background: active ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                    boxShadow: active ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
                  }}
                >
                  {/* Two-tone chip: the palette's paper with its accent as a dot.
                      System shows both halves, since it is whichever the OS says. */}
                  <span
                    className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
                    style={{
                      background: t.swatch[0],
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                    }}
                  >
                    {t.id === 'system' && (
                      <span className="absolute inset-y-0 right-0 w-1/2" style={{ background: '#1a1a18' }} />
                    )}
                    <span className="relative w-4 h-4 rounded-full" style={{ background: t.swatch[1] }} />
                  </span>
                  <span
                    className="text-[11px] font-medium leading-tight text-center"
                    style={{ color: active ? 'var(--color-accent)' : 'var(--color-foreground)' }}
                  >
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: 'var(--color-foreground-muted)' }}>Account</p>
          <div className="flex flex-col gap-2">
            <Row label="Change password" sub="Re-encrypts your key material" onClick={() => setShowChangePassword(v => !v)} />
          </div>
        </div>

        {showChangePassword && (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3 p-4 rounded-[var(--radius)]"
            style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
            <input type="password" placeholder="New password (min 8 chars)" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} autoComplete="new-password"
              className="w-full px-4 py-3 rounded-[var(--radius-sm)] text-sm outline-none"
              style={{ background: 'var(--color-background)', boxShadow: 'inset 0 0 0 1px var(--color-border)', color: 'var(--color-foreground)' }} />
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            {pwSuccess && <p className="text-xs" style={{ color: 'var(--color-accent)' }}>Password updated.</p>}
            <button type="submit" disabled={pwLoading}
              className="py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1 mt-2" style={{ color: 'var(--color-foreground-muted)' }}>Data</p>
          <div className="flex flex-col gap-2">
            <Row label="Export data" sub={`${cycles.length} cycles, ${logs.length} journal entries`} onClick={handleExport} />
          </div>
        </div>

        {/* Only shows when Nila isn't installed to the home screen yet. */}
        <InstallPrompt />

        {isPushSupported() && (
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1 mt-2" style={{ color: 'var(--color-foreground-muted)' }}>Notifications</p>
            <button
              onClick={handlePushToggle}
              disabled={pushLoading}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-[var(--radius)] transition-all"
              style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="text-left">
                <div className="text-sm font-medium">Period reminders</div>
                <div className="text-xs mt-0.5 opacity-50">
                  {pushEnabled ? 'On, tap to disable' : 'Off, tap to enable (requires home screen)'}
                </div>
              </div>
              <div
                className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
                style={{ background: pushEnabled ? 'var(--color-accent)' : 'var(--color-border)' }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: pushEnabled ? '22px' : '2px' }}
                />
              </div>
            </button>

            {pushEnabled && (
              <div className="mt-2 rounded-[var(--radius)] p-4 flex flex-col gap-3"
                style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
                {/* Quiet hours */}
                <button onClick={() => setQuietEnabled(v => !v)} className="flex items-center justify-between w-full">
                  <div className="text-left">
                    <div className="text-sm font-medium">Quiet hours</div>
                    <div className="text-xs mt-0.5 opacity-50">No reminders overnight</div>
                  </div>
                  <div className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
                    style={{ background: quietEnabled ? 'var(--color-accent)' : 'var(--color-border)' }}>
                    <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: quietEnabled ? '22px' : '2px' }} />
                  </div>
                </button>

                {quietEnabled && (
                  <div className="flex items-center gap-3">
                    <HourPicker label="From" value={quietStart} onChange={setQuietStart} />
                    <HourPicker label="To" value={quietEnd} onChange={setQuietEnd} />
                  </div>
                )}

                {/* Evening round-up */}
                <button onClick={() => setRoundup(v => !v)} className="flex items-center justify-between w-full pt-1">
                  <div className="text-left">
                    <div className="text-sm font-medium">Evening round-up</div>
                    <div className="text-xs mt-0.5 opacity-50">A gentle nudge if you haven&apos;t checked in</div>
                  </div>
                  <div className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
                    style={{ background: roundup ? 'var(--color-accent)' : 'var(--color-border)' }}>
                    <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: roundup ? '22px' : '2px' }} />
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1 mt-2" style={{ color: 'var(--color-foreground-muted)' }}>About</p>
          <div className="flex flex-col gap-2">
            <Row label="How Nila works" sub="A quick tour of everything" onClick={() => router.push('/guide?pane=guide&from=settings')} />
            <Row label="What's new" sub={`Version ${APP_VERSION}`} onClick={() => router.push('/guide?pane=new&from=settings')} />
          </div>
        </div>

        <div className="mt-2">
          <Row label="Sign out" accent onClick={handleSignOut} />
        </div>

        <button
          onClick={handleVersionTap}
          className="w-full text-center text-[10px] py-2 mt-2 select-none"
          style={{ opacity: 0.3, color: 'var(--color-foreground)' }}
        >
          Nila v{APP_VERSION} · private by design
        </button>

        {showDevReset && (
          <div className="rounded-[var(--radius)] p-4 flex flex-col gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.25)' }}>
            <p className="text-xs font-semibold" style={{ color: '#f87171' }}>Dev reset</p>
            <p className="text-xs" style={{ color: 'var(--color-foreground-muted)' }}>
              Clears all local storage, IndexedDB, and signs out. You'll need to delete the Supabase user separately.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDevReset(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium"
                style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDevReset}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
                style={{ background: '#ef4444' }}
              >
                {resetting ? 'Resetting…' : 'Reset everything'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
