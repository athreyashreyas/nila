'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { derivePasswordKey, unwrapMasterKey } from '@/lib/encryption/core';
import { useEncryption } from '@/lib/encryption/context';

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
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('key_salt, wrapped_key, pbkdf2_iterations')
        .single();
      if (profileError) throw profileError;

      const pdk = await derivePasswordKey(password, profile.key_salt, profile.pbkdf2_iterations);
      const masterKey = await unwrapMasterKey(profile.wrapped_key, pdk);
      mountKey(masterKey);

      router.push('/home');
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid login')) {
        setError('Incorrect email or password.');
      } else if (err instanceof DOMException) {
        setError('Incorrect password — could not decrypt your account.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {confirmed && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
          Email confirmed — sign in to access your data.
        </div>
      )}
      {confirmError && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm text-center text-red-400"
          style={{ background: 'var(--color-surface)', border: '1px solid #f87171' }}>
          Confirmation link expired or invalid. Try signing up again.
        </div>
      )}
      <h1 className="text-xl font-medium mb-1">Welcome back</h1>
      <p className="text-sm opacity-60 mb-8">Sign in to access your encrypted data.</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[--color-surface] border border-[--color-border] text-sm outline-none focus:border-[--color-accent]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[--color-surface] border border-[--color-border] text-sm outline-none focus:border-[--color-accent]"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[--color-accent] text-white text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Unlocking…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm opacity-60">
        <Link href="/recover" className="underline underline-offset-2">Forgot password?</Link>
      </p>
      <p className="mt-3 text-center text-sm opacity-60">
        No account?{' '}
        <Link href="/signup" className="opacity-100 underline underline-offset-2">Create one</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
