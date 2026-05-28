'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@supabase/ssr';
import { setupEncryption } from '@/lib/encryption/setup';
import { saveKey } from '@/lib/encryption/keyStore';
import { useEncryption } from '@/lib/encryption/context';
import { createProfile } from '@/app/actions/createProfile';

type Step = 'form' | 'phrase' | 'email-check';

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: 'easeOut' as const },
};

const inputStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-foreground)',
};

const btnStyle = { background: 'var(--color-accent)' };

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
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
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

      if (!data.user) {
        // Supabase silently returns null when email is already registered.
        // Show a clear message rather than the email-check screen (which implies success).
        throw new Error('This email is already registered. Check your inbox for a confirmation link, or sign in if already confirmed.');
      }

      const { error: profileError } = await createProfile(data.user.id, {
        key_salt: profileKeyData.key_salt,
        wrapped_key: profileKeyData.wrapped_key,
        recovery_wrapped_key: profileKeyData.recovery_wrapped_key ?? null,
        pbkdf2_iterations: profileKeyData.pbkdf2_iterations,
      });
      if (profileError) throw new Error(profileError);

      await saveKey(masterKey);
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
      <motion.div {...fade} className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h1 className="text-xl font-medium mb-2">Check your inbox</h1>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
          We sent a confirmation link to{' '}
          <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{email}</span>.
          Click it to verify, then sign in.
        </p>
        <p className="text-xs" style={{ color: 'var(--color-foreground-muted)' }}>
          Already confirmed?{' '}
          <Link href="/login" className="underline underline-offset-2">Sign in instead.</Link>
        </p>
      </motion.div>
    );
  }

  if (step === 'phrase') {
    const words = recoveryPhrase.split(' ');
    return (
      <motion.div {...fade} className="w-full max-w-sm">
        <h1 className="text-xl font-medium mb-1">Your recovery phrase</h1>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
          Write these 12 words down somewhere safe. They&apos;re the only way to recover your data if you forget your password.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-6 p-4 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {words.map((word, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs w-4 text-right shrink-0" style={{ color: 'var(--color-foreground-muted)' }}>{i + 1}</span>
              <span className="text-sm font-mono">{word}</span>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4" style={{ accentColor: 'var(--color-accent)' }} />
          <span className="text-sm">I have written down my recovery phrase and stored it safely.</span>
        </label>

        <motion.button whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
          onClick={() => setStep('email-check')} disabled={!confirmed}
          className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={btnStyle}>
          Continue
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div {...fade} className="w-full max-w-sm">
      <h1 className="text-xl font-medium mb-1">Create your account</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-foreground-muted)' }}>
        Your health data is encrypted end-to-end — only you can read it.
      </p>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input id="password" type="password" autoComplete="new-password" required minLength={8}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle} />
          <p className="text-xs" style={{ color: 'var(--color-foreground-muted)' }}>
            Minimum 8 characters. This encrypts your data — do not forget it.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <motion.button type="submit" whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
          disabled={loading}
          className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-60"
          style={btnStyle}>
          {loading ? 'Setting up encryption…' : 'Create account'}
        </motion.button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
        Already have an account?{' '}
        <Link href="/login" className="underline underline-offset-2" style={{ color: 'var(--color-foreground)' }}>Sign in</Link>
      </p>
    </motion.div>
  );
}
