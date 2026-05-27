'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import {
  deriveRecoveryKey,
  unwrapMasterKey,
  derivePasswordKey,
  wrapMasterKey,
  generateSalt,
} from '@/lib/encryption/core';
import { useEncryption } from '@/lib/encryption/context';

type Step = 'phrase' | 'newpassword';

export default function RecoverPage() {
  const router = useRouter();
  const { mountKey } = useEncryption();
  const [step, setStep] = useState<Step>('phrase');
  const [email, setEmail] = useState('');
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingMasterKey, setPendingMasterKey] = useState<CryptoKey | null>(null);
  const [pendingUserId, setPendingUserId] = useState('');

  function setWord(index: number, value: string) {
    setWords((prev) => {
      const next = [...prev];
      next[index] = value.trim().toLowerCase();
      return next;
    });
  }

  async function handlePhraseSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phrase = words.join(' ').trim();
    if (words.some((w) => !w)) {
      setError('Please fill in all 12 words.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Sign in with OTP to verify email ownership before allowing key recovery
      const { error: otpError } = await supabase.auth.signInWithOtp({ email });
      if (otpError) throw otpError;

      // Fetch key material by email — requires a service lookup via RPC or we
      // use a public recovery flow. For now: sign in anonymously to fetch profile
      // using the recovery_wrapped_key after OTP verification.
      // Simplified: fetch profile after magic link (handled on return).
      // Here we just verify the phrase can derive a recovery key and store it.
      const recoveryKey = await deriveRecoveryKey(phrase);

      // We can't verify the phrase without the wrapped key yet (user must click email link).
      // Store the derived key candidate and advance to password step.
      // The actual unwrap verification happens in handleNewPassword after OTP.
      setPendingMasterKey(null); // Will be set after OTP
      void recoveryKey; // validated shape only

      setStep('newpassword');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const phrase = words.join(' ').trim();
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated. Please use the magic link sent to your email first.');

      // Fetch recovery key material
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('recovery_wrapped_key, pbkdf2_iterations')
        .single();
      if (profileError) throw profileError;
      if (!profile.recovery_wrapped_key) throw new Error('No recovery key found for this account.');

      // Derive recovery key from phrase and unwrap master key
      const recoveryKey = await deriveRecoveryKey(phrase);
      const masterKey = await unwrapMasterKey(profile.recovery_wrapped_key, recoveryKey);

      // Re-wrap master key under new password
      const newSalt = generateSalt();
      const newPdk = await derivePasswordKey(newPassword, newSalt, profile.pbkdf2_iterations);
      const newWrappedKey = await wrapMasterKey(masterKey, newPdk);

      // Update password in Supabase Auth
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) throw pwError;

      // Update key material in profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ key_salt: newSalt, wrapped_key: newWrappedKey })
        .eq('id', user.id);
      if (updateError) throw updateError;

      mountKey(masterKey);
      router.push('/home');
    } catch (err) {
      if (err instanceof DOMException) {
        setError('Incorrect recovery phrase — could not decrypt your account.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === 'newpassword') {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-medium mb-1">Set a new password</h1>
        <p className="text-sm opacity-60 mb-2">
          Check your email for a magic link. Once you&apos;ve clicked it, set your new password here.
        </p>
        <p className="text-sm opacity-60 mb-8">
          Your data will be re-encrypted under the new password automatically.
        </p>

        <form onSubmit={handleNewPassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newpw" className="text-sm font-medium">New password</label>
            <input
              id="newpw"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[--color-surface] border border-[--color-border] text-sm outline-none focus:border-[--color-accent]"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[--color-accent] text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? 'Recovering…' : 'Set new password'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-medium mb-1">Recover your account</h1>
      <p className="text-sm opacity-60 mb-8">
        Enter your email and the 12-word recovery phrase you wrote down at signup.
      </p>

      <form onSubmit={handlePhraseSubmit} className="flex flex-col gap-4">
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

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Recovery phrase</span>
          <div className="grid grid-cols-3 gap-2">
            {words.map((word, i) => (
              <div key={i} className="flex items-center gap-1 bg-[--color-surface] border border-[--color-border] rounded-xl px-2 py-2">
                <span className="text-xs opacity-40 w-4 shrink-0 text-right">{i + 1}</span>
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={word}
                  onChange={(e) => setWord(i, e.target.value)}
                  className="w-full bg-transparent text-sm outline-none font-mono min-w-0"
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[--color-accent] text-white text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Verifying…' : 'Continue'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm opacity-60">
        Remembered your password?{' '}
        <Link href="/login" className="underline underline-offset-2">Sign in</Link>
      </p>
    </div>
  );
}
