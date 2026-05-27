'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useEncryption } from '@/lib/encryption/context';
import { derivePasswordKey, wrapMasterKey, generateSalt } from '@/lib/encryption/core';
import { useCycles } from '@/hooks/useCycles';
import { useDailyLog } from '@/hooks/useDailyLog';

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { getMasterKey, clearKey } = useEncryption();
  const { cycles } = useCycles();
  const { logs } = useDailyLog();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleSignOut() {
    clearKey();
    await supabase().auth.signOut();
    router.push('/login');
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
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="text-left">
        <div className="text-sm font-medium" style={{ color: danger ? '#f87171' : undefined }}>{label}</div>
        {sub && <div className="text-xs mt-0.5 opacity-50">{sub}</div>}
      </div>
      <span className="opacity-30 text-base">›</span>
    </button>
  );

  return (
    <div className="px-5 pt-4 pb-28">
      <h1 className="text-2xl font-bold pt-2 mb-5">Settings</h1>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: 'var(--color-foreground-muted)' }}>Account</p>
          <div className="flex flex-col gap-2">
            <Row label="Change password" sub="Re-encrypts your key material" onClick={() => setShowChangePassword(v => !v)} />
          </div>
        </div>

        {showChangePassword && (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3 p-4 rounded-[var(--radius)]"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <input type="password" placeholder="New password (min 8 chars)" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} autoComplete="new-password"
              className="w-full px-4 py-3 rounded-[var(--radius-sm)] text-sm outline-none"
              style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }} />
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            {pwSuccess && <p className="text-xs" style={{ color: 'var(--color-accent)' }}>Password updated.</p>}
            <button type="submit" disabled={pwLoading}
              className="py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: '#fff' }}>
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

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2 px-1 mt-2" style={{ color: 'var(--color-foreground-muted)' }}>Privacy</p>
          <div className="rounded-[var(--radius)] p-4 text-xs leading-relaxed"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            Your health data is encrypted end-to-end. Nila's servers store only encrypted bytes — no period dates, symptoms, or notes are ever readable by anyone but you.
          </div>
        </div>

        <div className="mt-2">
          <Row label="Sign out" danger onClick={handleSignOut} />
        </div>

        <p className="text-center text-[10px] opacity-30 mt-2">Nila · private by design</p>
      </div>
    </div>
  );
}
