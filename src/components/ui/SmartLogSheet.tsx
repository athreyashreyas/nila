'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toISODate, fromISODate, daysBetween, subDays, startOfDay } from '@/lib/utils/dates';
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

  // Normalise both ends to midnight for accurate day counting
  const daysAgo = daysBetween(fromISODate(startDate), startOfDay(new Date()));
  const showEndStep = daysAgo > 5;

  const smartHint = (): string | null => {
    const predictedStr = prediction.nextPeriodDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (prediction.daysUntilNextPeriod < -3) {
      return `Period estimated around ${predictedStr}, adjust if needed`;
    }
    if (prediction.daysUntilNextPeriod <= 0) {
      // Predicted date is today or in the past, pre-filled for them
      return `Period predicted around ${predictedStr}, adjust if the date is wrong`;
    }
    if (prediction.daysUntilNextPeriod <= 3) {
      // Predicted date is upcoming, pre-filling today, not the future date
      return `Period expected around ${predictedStr}, logging today, change if needed`;
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
  const hint = smartHint();

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-6 pt-4 pb-2 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Log period</h2>
            {hint && (
              <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>
                {hint}
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

        {/* Start date */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: 'var(--color-foreground-muted)' }}>
            When did it start?
          </p>
          <div className="rounded-[var(--radius-sm)] px-4 py-3"
            style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-border)' }}>
            <input
              type="date"
              value={startDate}
              min={ninetyDaysAgo}
              max={today}
              onChange={(e) => {
                const val = e.target.value;
                if (!val || val > today) return; // hard block: no future dates
                setStartDate(val);
                if (endDate < val) setEndDate(val);
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

        {/* Has it ended? — only shown if start > 5 days ago */}
        {showEndStep && (
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--color-foreground-muted)' }}>
              Has it ended?
            </p>
            <div className="flex gap-2">
              {(['Still going', 'It ended'] as const).map((label) => {
                const active = label === 'It ended' ? ended : !ended;
                return (
                  <button
                    key={label}
                    onClick={() => setEnded(label === 'It ended')}
                    className="flex-1 py-3 rounded-[var(--radius-sm)] text-sm font-semibold"
                    style={{
                      background: active ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                      boxShadow: active ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
                      color: active ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
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
                  style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-border)' }}>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-foreground-muted)' }}>End date</p>
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

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={confirmDisabled}
          onPointerDown={(e) => !confirmDisabled && (e.currentTarget.style.transform = 'scale(0.97)')}
          onPointerUp={(e) => (e.currentTarget.style.transform = '')}
          onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
          className="w-full py-3.5 rounded-full text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)', transition: 'transform 0.08s ease' }}
        >
          {saving ? 'Saving…' : 'Log period'}
        </button>
      </div>
    </BottomSheet>
  );
}
