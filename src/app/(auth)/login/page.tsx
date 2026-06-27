'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getSupabaseClient } from '@/lib/supabase/client';
import { derivePasswordKey, unwrapMasterKey } from '@/lib/encryption/core';
import { saveKey } from '@/lib/encryption/keyStore';
import { useEncryption } from '@/lib/encryption/context';

const inputStyle = {
  background: 'var(--color-surface)',
  boxShadow: 'inset 0 0 0 1px var(--color-border)',
  color: 'var(--color-foreground)',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmed = searchParams.get('confirmed') === '1';
  const confirmError = searchParams.get('error') === 'confirmation-failed';
  const { mountKey } = useEncryption();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('key_salt, wrapped_key, pbkdf2_iterations')
        .single();
      if (profileError) throw profileError;

      const pdk = await derivePasswordKey(password, profile.key_salt, profile.pbkdf2_iterations);
      const masterKey = await unwrapMasterKey(profile.wrapped_key, pdk);
      await saveKey(masterKey);
      mountKey(masterKey);
      router.push('/home');
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? '';
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setError('no-account');
      } else if (err instanceof DOMException) {
        setError('That password doesn\'t look right. Please try again.');
      } else {
        setError(msg || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' as const }}
      className="w-full max-w-sm"
    >
      {confirmed && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm text-center"
          style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-accent)', color: 'var(--color-accent)' }}>
          Email confirmed. Sign in to access your data.
        </div>
      )}
      {confirmError && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm text-center text-red-400"
          style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px #f87171' }}>
          Confirmation link expired or invalid. Try signing up again.
        </div>
      )}

      <h1 className="text-xl font-medium mb-1">Welcome back</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-foreground-muted)' }}>
        Sign in to access your encrypted data.
      </p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input id="password" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle} />
        </div>

        {error === 'no-account' ? (
          <p className="text-sm text-red-400">
            No account found for that email.{' '}
            <Link href="/signup" className="underline underline-offset-2 text-red-300">Create one instead?</Link>
          </p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : null}

        <motion.button type="submit" whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
          disabled={loading}
          className="w-full py-3 rounded-full text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
          {loading ? 'Unlocking…' : 'Sign in'}
        </motion.button>
      </form>

      <p className="mt-4 text-center text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
        <Link href="/recover" className="underline underline-offset-2">Forgot password?</Link>
      </p>
      <p className="mt-3 text-center text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
        No account?{' '}
        <Link href="/signup" className="underline underline-offset-2" style={{ color: 'var(--color-foreground)' }}>Create one</Link>
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
