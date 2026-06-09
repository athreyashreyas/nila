'use client';

import { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toISODate } from '@/lib/utils/dates';
import type { DecryptedCycle, DecryptedDailyLog } from '@/types/app';

interface Props {
  open: boolean;
  onClose: () => void;
  openCycle: DecryptedCycle;
  logs: DecryptedDailyLog[];
  onConfirm: (endDate: string) => Promise<void>;
}

export function EndPeriodSheet({ open, onClose, openCycle, logs, onConfirm }: Props) {
  const today = toISODate(new Date());

  const smartDefault = (): string => {
    const lastFlowLog = [...logs]
      .filter(l => l.payload.flow && l.payload.flow !== 'none' && l.payload.date >= openCycle.payload.periodStart)
      .sort((a, b) => b.payload.date.localeCompare(a.payload.date))[0];
    return lastFlowLog?.payload.date ?? today;
  };

  const [endDate, setEndDate] = useState(smartDefault);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEndDate(smartDefault());
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm(endDate);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const periodStart = openCycle.payload.periodStart;
  const confirmDisabled = saving || endDate < periodStart || endDate > today;

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="60vh">
      <div className="px-6 pt-4 pb-2 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">End period</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-foreground-muted)' }}>
              When did your period end?
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'var(--color-surface)', color: 'var(--color-foreground-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Date picker */}
        <div>
          <div className="rounded-[var(--radius-sm)] px-4 py-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <input
              type="date"
              value={endDate}
              min={periodStart}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-transparent text-base font-medium focus:outline-none"
              style={{ color: 'var(--color-foreground)', colorScheme: 'auto' }}
            />
          </div>
          <p className="text-xs mt-1.5 pl-1" style={{ color: 'var(--color-foreground-muted)' }}>
            Started {new Date(periodStart + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={confirmDisabled}
          onPointerDown={(e) => !confirmDisabled && (e.currentTarget.style.transform = 'scale(0.97)')}
          onPointerUp={(e) => (e.currentTarget.style.transform = '')}
          onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
          className="w-full py-3.5 rounded-[var(--radius)] text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: '#fff', transition: 'transform 0.08s ease' }}
        >
          {saving ? 'Saving…' : 'End period'}
        </button>
      </div>
    </BottomSheet>
  );
}
