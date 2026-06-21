'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useEncryption } from '@/lib/encryption/context';
import { useTheme, type ThemeMode } from '@/lib/theme/context';
import { derivePasswordKey, wrapMasterKey, generateSalt } from '@/lib/encryption/core';
import { useAppData } from '@/lib/data/context';
import { clearKey as clearIDBKey } from '@/lib/encryption/keyStore';
import { registerPushSubscription, unregisterPushSubscription, isPushSupported } from '@/lib/push/register';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { APP_VERSION, CHANGELOG } from '@/lib/version';

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { getMasterKey, clearKey } = useEncryption();
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
  const [showChangelog, setShowChangelog] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub))
      );
    }
  }, []);

  async function handlePushToggle() {
    setPushLoading(true);
    try {
      const db = supabase();
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
            device_name: navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Device',
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
    await supabase().auth.signOut();
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
      await supabase().auth.signOut();
      router.replace('/login');
    } finally {
      setResetting(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    const masterKey = getMasterKey();
    if (!masterKey) { setPwError('Encryption key not loaded.'); return; }
    setPwLoading(true);
    setPwError('');
    try {
      const db = supabase();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error('Not signed in.');

      const { data: profile } = await db.from('profiles').select('pbkdf2_iterations').single();
      const iterations = profile?.pbkdf2_iterations ?? 600_000;

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

  const Row = ({ label, sub, onClick, danger = false }: { label: string; sub?: string; onClick: () => void; danger?: boolean }) => (
    <button onClick={onClick} className="flex items-center justify-between w-full px-4 py-3.5 rounded-[var(--radius)] transition-all"
      style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
      <div className="text-left">
        <div className="text-sm font-medium" style={{ color: danger ? '#f87171' : undefined }}>{label}</div>
        {sub && <div className="text-xs mt-0.5 opacity-50">{sub}</div>}
      </div>
      <span className="opacity-30 text-base">›</span>
    </button>
  );

  return (
    <div className="px-5 pt-4 pb-28">
      <h1 className="font-display text-2xl font-bold pt-2 mb-5">Settings</h1>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: 'var(--color-foreground-muted)' }}>Appearance</p>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className="flex-1 py-3 rounded-[var(--radius-sm)] text-sm font-medium capitalize transition-all"
                style={{
                  background: theme === t ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                  boxShadow: theme === t ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
                  color: theme === t ? 'var(--color-accent)' : 'var(--color-foreground)',
                }}
              >
                {t === 'system' ? 'Auto' : t === 'light' ? '☀️ Light' : '🌙 Dark'}
              </button>
            ))}
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
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1 mt-2" style={{ color: 'var(--color-foreground-muted)' }}>Privacy</p>
          <div className="rounded-[var(--radius)] p-4 text-xs leading-relaxed"
            style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)', color: 'var(--color-foreground-muted)' }}>
            Your health data is encrypted end-to-end. Nila's servers store only encrypted bytes, so no period dates, symptoms, or notes are ever readable by anyone but you.
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1 mt-2" style={{ color: 'var(--color-foreground-muted)' }}>About</p>
          <div className="flex flex-col gap-2">
            <Row label="What's new" sub={`Version ${APP_VERSION}`} onClick={() => setShowChangelog(true)} />
          </div>
        </div>

        <div className="mt-2">
          <Row label="Sign out" danger onClick={handleSignOut} />
        </div>

        <button
          onClick={handleVersionTap}
          className="w-full text-center text-[10px] py-2 mt-2 select-none"
          style={{ opacity: 0.3, color: 'var(--color-foreground)' }}
        >
          Nila v{APP_VERSION} · private by design
        </button>

        <BottomSheet open={showChangelog} onClose={() => setShowChangelog(false)} maxHeight="70vh">
          <div className="px-6 pt-3 pb-2">
            <h2 className="font-display text-xl font-bold mb-1">What's new</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-foreground-muted)' }}>
              You're running version {APP_VERSION}.
            </p>
            <div className="flex flex-col gap-5">
              {CHANGELOG.map((entry) => (
                <div key={entry.version}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-semibold">Version {entry.version}</span>
                    <span className="text-xs opacity-50">
                      {new Date(entry.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {entry.highlights.map((h, i) => (
                      <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: 'var(--color-foreground-muted)' }}>
                        <span style={{ color: 'var(--color-accent)' }}>•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </BottomSheet>

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
