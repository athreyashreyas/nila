'use client';

import { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/SheetHeader';
import { DateField } from '@/components/ui/DateField';
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
        <SheetHeader title="End period" subtitle="When did your period end?" onClose={onClose} />

        {/* Date picker */}
        <div>
          <DateField
            value={endDate}
            min={periodStart}
            max={today}
            onChange={(val) => setEndDate(val)}
          />
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
          className="w-full py-3.5 rounded-full text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)', transition: 'transform 0.08s ease' }}
        >
          {saving ? 'Saving…' : 'End period'}
        </button>
      </div>
    </BottomSheet>
  );
}
