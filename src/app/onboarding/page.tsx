'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const CYCLE_OPTIONS = [
  { label: 'Under 25', value: 23 },
  { label: '25–27 days', value: 26 },
  { label: '28 days', value: 28 },
  { label: '29–31 days', value: 30 },
  { label: '32–35 days', value: 33 },
  { label: '36+ days', value: 37 },
] as const;

const PERIOD_OPTIONS = [
  { label: '2–3 days', value: 3 },
  { label: '4–5 days', value: 5 },
  { label: '6–7 days', value: 6 },
  { label: '8+ days', value: 8 },
] as const;

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [cycleLength, setCycleLength] = useState<number | null>(null);
  const [periodLength, setPeriodLength] = useState<number | null>(null);
  const [lastPeriodDate, setLastPeriodDate] = useState('');

  useEffect(() => {
    try {
      if (localStorage.getItem('nila-onboarded')) router.replace('/home');
    } catch {}
  }, [router]);

  function finish(dateVal: string | null) {
    try {
      localStorage.setItem('nila-prefs', JSON.stringify({
        cycleLength: cycleLength ?? 28,
        periodLength: periodLength ?? 5,
        lastPeriodDate: dateVal || null,
      }));
      localStorage.setItem('nila-onboarded', 'true');
    } catch {}
    router.replace('/home');
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--color-background)' }}>
      <div className="w-full max-w-sm">

        {/* Welcome header */}
        <div className="text-center mb-10">
          <div className="text-4xl mb-3">🌕</div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Welcome to Nila
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-foreground-muted)' }}>
            Three quick questions to personalise your experience.
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-10 justify-center">
          {[1, 2, 3].map((s) => (
            <div key={s} className="h-1 rounded-full transition-all duration-300"
              style={{
                width: s === step ? '28px' : '8px',
                background: s <= step ? 'var(--color-accent)' : 'var(--color-border)',
              }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" {...fade}>
              <h2 className="text-lg font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                How long is your cycle?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-foreground-muted)' }}>
                From the first day of one period to the first day of the next.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {CYCLE_OPTIONS.map((opt) => (
                  <button key={opt.label}
                    onClick={() => { setCycleLength(opt.value); setStep(2); }}
                    className="py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-95"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={() => { setCycleLength(28); setStep(2); }}
                className="w-full py-3 text-sm transition-all"
                style={{ color: 'var(--color-foreground-muted)' }}>
                I don't know — use default
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" {...fade}>
              <h2 className="text-lg font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                How long does your period last?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-foreground-muted)' }}>
                Count from the first to the last day of bleeding.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PERIOD_OPTIONS.map((opt) => (
                  <button key={opt.label}
                    onClick={() => { setPeriodLength(opt.value); setStep(3); }}
                    className="py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-95"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={() => { setPeriodLength(5); setStep(3); }}
                className="w-full py-3 text-sm transition-all"
                style={{ color: 'var(--color-foreground-muted)' }}>
                I don't know — use default
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" {...fade} className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                  When did your last period start?
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
                  Your best guess is fine — this helps predict your next period right away.
                </p>
              </div>
              <input
                type="date"
                max={today}
                value={lastPeriodDate}
                onChange={(e) => setLastPeriodDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              />
              <button
                onClick={() => finish(lastPeriodDate || null)}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {lastPeriodDate ? "Let's go" : 'Skip for now'}
              </button>
              <button onClick={() => finish(null)}
                className="text-sm text-center py-1"
                style={{ color: 'var(--color-foreground-muted)', opacity: 0.5 }}>
                I don't remember
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
