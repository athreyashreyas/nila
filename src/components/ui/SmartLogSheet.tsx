'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toISODate, fromISODate, daysBetween, subDays } from '@/lib/utils/dates';
import type { PredictionResult } from '@/types/app';

interface Props {
  open: boolean;
  onClose: () => void;
  prediction: PredictionResult;
  onConfirm: (startDate: string, endDate: string | null) => Promise<void>;
}

export function SmartLogSheet({ open, onClose, prediction, onConfirm }: Props) {
  const today = toISODate(new Date());
  const ninetyDaysAgo = toISODate(subDays(new Date(), 90));

  const smartDefaultStart = (): string => {
    // If overdue or approaching, suggest the predicted date (clamped to today)
    if (prediction.daysUntilNextPeriod <= 3) {
      const predicted = toISODate(prediction.nextPeriodDate);
      return predicted <= today ? predicted : today;
    }
    return today;
  };

  const [startDate, setStartDate] = useState(smartDefaultStart);
  const [ended, setEnded] = useState(false);
  const [endDate, setEndDate] = useState(today);
  const [saving, setSaving] = useState(false);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      const d = smartDefaultStart();
      setStartDate(d);
      setEnded(false);
      setEndDate(today);
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const daysAgo = daysBetween(fromISODate(startDate), new Date());
  const showEndStep = daysAgo > 5;

  const smartHint = (): string | null => {
    const abs = Math.abs(prediction.daysUntilNextPeriod);
    const predictedStr = prediction.nextPeriodDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (prediction.daysUntilNextPeriod < -3) {
      return `Period estimated around ${predictedStr} — adjust if needed`;
    }
    if (prediction.daysUntilNextPeriod <= 3) {
      return `Period expected around ${predictedStr} — confirm or adjust`;
    }
    return null;
  };

  const daysAgoLabel = (): string => {
    if (daysAgo === 0) return 'today';
    if (daysAgo === 1) return 'yesterday';
    return `${daysAgo} days ago`;
  };

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm(startDate, showEndStep && ended ? endDate : null);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const confirmDisabled = saving || (showEndStep && ended && endDate < startDate);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="smart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={onClose}
          />
          <motion.div
            key="smart-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
            style={{
              background: 'var(--color-background)',
              paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
            </div>

            <div className="px-6 pt-4 pb-2 flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold">Log period</h2>
                  {smartHint() && (
                    <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>
                      {smartHint()}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-foreground-muted)' }}
                >
                  ✕
                </button>
              </div>

              {/* Step 1: Start date */}
              <div>
                <p className="text-[11px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'var(--color-foreground-muted)' }}>
                  When did it start?
                </p>
                <div className="rounded-[var(--radius-sm)] px-4 py-3"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <input
                    type="date"
                    value={startDate}
                    min={ninetyDaysAgo}
                    max={today}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      // Reset end date if it becomes before start
                      if (endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    className="w-full bg-transparent text-base font-medium focus:outline-none"
                    style={{ color: 'var(--color-foreground)', colorScheme: 'auto' }}
                  />
                </div>
                {daysAgo >= 0 && (
                  <p className="text-xs mt-1.5 pl-1" style={{ color: 'var(--color-foreground-muted)' }}>
                    {daysAgoLabel()}
                  </p>
                )}
              </div>

              {/* Step 2: Has it ended? (only if start > 5 days ago) */}
              {showEndStep && (
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--color-foreground-muted)' }}>
                    Has it ended?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEnded(false)}
                      className="flex-1 py-3 rounded-[var(--radius-sm)] text-sm font-semibold"
                      style={{
                        background: !ended ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                        border: `1.5px solid ${!ended ? 'var(--color-accent)' : 'transparent'}`,
                        color: !ended ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      Still going
                    </button>
                    <button
                      onClick={() => setEnded(true)}
                      className="flex-1 py-3 rounded-[var(--radius-sm)] text-sm font-semibold"
                      style={{
                        background: ended ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                        border: `1.5px solid ${ended ? 'var(--color-accent)' : 'transparent'}`,
                        color: ended ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      It ended
                    </button>
                  </div>

                  {ended && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="rounded-[var(--radius-sm)] px-4 py-3"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <p className="text-xs mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
                          End date
                        </p>
                        <input
                          type="date"
                          value={endDate}
                          min={startDate}
                          max={today}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-transparent text-base font-medium focus:outline-none"
                          style={{ color: 'var(--color-foreground)', colorScheme: 'auto' }}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={confirmDisabled}
                onPointerDown={(e) => !confirmDisabled && (e.currentTarget.style.transform = 'scale(0.97)')}
                onPointerUp={(e) => (e.currentTarget.style.transform = '')}
                onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
                className="w-full py-3.5 rounded-[var(--radius)] text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--color-accent)', color: '#fff', transition: 'transform 0.08s ease' }}
              >
                {saving ? 'Saving…' : 'Log period'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
