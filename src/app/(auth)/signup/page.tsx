'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { setupEncryption } from '@/lib/encryption/setup';
import { useEncryption } from '@/lib/encryption/context';
import { createProfile } from '@/app/actions/createProfile';

type Step = 'form' | 'phrase' | 'email-check';

export default function SignupPage() {
  const { mountKey } = useEncryption();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { profileKeyData, recoveryPhrase: phrase, masterKey } = await setupEncryption(password);

      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!data.user) throw new Error('No user returned from sign up.');

      await createProfile(data.user.id, {
        key_salt: profileKeyData.key_salt,
        wrapped_key: profileKeyData.wrapped_key,
        recovery_wrapped_key: profileKeyData.recovery_wrapped_key ?? null,
        pbkdf2_iterations: profileKeyData.pbkdf2_iterations,
      });

      mountKey(masterKey);
      setRecoveryPhrase(phrase);
      setStep('phrase');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'email-check') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h1 className="text-xl font-medium mb-2">Check your inbox</h1>
        <p className="text-sm opacity-60 mb-6 leading-relaxed">
          We sent a confirmation link to <span className="font-medium opacity-100">{email}</span>.
          Click it to verify your account, then sign in.
        </p>
        <p className="text-xs opacity-40">
          After confirming, you&apos;ll be taken to the sign-in page. Your data is ready whenever you are.
        </p>
      </div>
    );
  }

  if (step === 'phrase') {
    const words = recoveryPhrase.split(' ');
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-medium mb-1">Your recovery phrase</h1>
        <p className="text-sm opacity-60 mb-6">
          Write these 12 words down and keep them somewhere safe. They&apos;re the only way to recover your data if you forget your password. Nila cannot recover them for you.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-6 p-4 rounded-2xl bg-[--color-surface] border border-[--color-border]">
          {words.map((word, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs opacity-40 w-4 text-right shrink-0">{i + 1}</span>
              <span className="text-sm font-mono">{word}</span>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[--color-accent]"
          />
          <span className="text-sm">I have written down my recovery phrase and stored it safely.</span>
        </label>

        <button
          onClick={() => setStep('email-check')}
          disabled={!confirmed}
          className="w-full py-3 rounded-xl bg-[--color-accent] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-medium mb-1">Create your account</h1>
      <p className="text-sm opacity-60 mb-8">Your health data is encrypted end-to-end — only you can read it.</p>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[--color-surface] border border-[--color-border] text-sm outline-none focus:border-[--color-accent]"
          />
          <p className="text-xs opacity-50">Minimum 8 characters. This encrypts your data — do not forget it.</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[--color-accent] text-white text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Setting up encryption…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm opacity-60">
        Already have an account?{' '}
        <Link href="/login" className="opacity-100 underline underline-offset-2">Sign in</Link>
      </p>
    </div>
  );
}
