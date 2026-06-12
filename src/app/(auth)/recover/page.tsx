'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
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

export default function RecoverPage() {
  const router = useRouter();
  const { mountKey } = useEncryption();
  const [step, setStep] = useState<Step>('phrase');
  const [email, setEmail] = useState('');
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function setWord(index: number, value: string) {
    setWords((prev) => {
      const next = [...prev];
      next[index] = value.trim().toLowerCase();
      return next;
    });
  }

  async function handlePhraseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (words.some((w) => !w)) { setError('Please fill in all 12 words.'); return; }
    setLoading(true);
    setError('');
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: otpError } = await supabase.auth.signInWithOtp({ email });
      if (otpError) throw otpError;
      setStep('newpassword');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('recovery_wrapped_key, pbkdf2_iterations').single();
      if (profileError) throw profileError;
      if (!profile.recovery_wrapped_key) throw new Error('No recovery key found for this account.');

      const recoveryKey = await deriveRecoveryKey(phrase);
      const masterKey = await unwrapMasterKey(profile.recovery_wrapped_key, recoveryKey);

      const newSalt = generateSalt();
      const newPdk = await derivePasswordKey(newPassword, newSalt, profile.pbkdf2_iterations);
      const newWrappedKey = await wrapMasterKey(masterKey, newPdk);

      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) throw pwError;

      const { error: updateError } = await supabase
        .from('profiles').update({ key_salt: newSalt, wrapped_key: newWrappedKey }).eq('id', user.id);
      if (updateError) throw updateError;

      mountKey(masterKey);
      router.push('/home');
    } catch (err) {
      if (err instanceof DOMException) {
        setError('That recovery phrase doesn\'t look right. Please check it and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === 'newpassword') {
    return (
      <motion.div {...fade} className="w-full max-w-sm">
        <h1 className="text-xl font-medium mb-1">Set a new password</h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
          Check your email for a magic link. Once you&apos;ve clicked it, set your new password here.
        </p>

        <form onSubmit={handleNewPassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newpw" className="text-sm font-medium">New password</label>
            <input id="newpw" type="password" autoComplete="new-password" required minLength={8}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={inputStyle} />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <motion.button type="submit" whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-60"
            style={{ background: 'var(--color-accent)' }}>
            {loading ? 'Recovering…' : 'Set new password'}
          </motion.button>
        </form>
      </motion.div>
    );
  }

  return (
    <motion.div {...fade} className="w-full max-w-sm">
      <h1 className="text-xl font-medium mb-1">Recover your account</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-foreground-muted)' }}>
        Enter your email and the 12-word recovery phrase you wrote down at signup.
      </p>

      <form onSubmit={handlePhraseSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Recovery phrase</span>
          <div className="grid grid-cols-3 gap-2">
            {words.map((word, i) => (
              <div key={i} className="flex items-center gap-1 rounded-xl px-2 py-2"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <span className="text-xs w-4 shrink-0 text-right" style={{ color: 'var(--color-foreground-muted)' }}>{i + 1}</span>
                <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  value={word} onChange={(e) => setWord(i, e.target.value)}
                  className="w-full bg-transparent text-sm outline-none font-mono min-w-0" />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <motion.button type="submit" whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
          disabled={loading}
          className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--color-accent)' }}>
          {loading ? 'Verifying…' : 'Continue'}
        </motion.button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
        Remembered your password?{' '}
        <Link href="/login" className="underline underline-offset-2">Sign in</Link>
      </p>
    </motion.div>
  );
}
