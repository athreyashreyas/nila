'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toISODate } from '@/lib/utils/dates';
import type { CyclePayload, DecryptedCycle } from '@/types/app';

interface Props {
  open: boolean;
  onClose: () => void;
  cycle: DecryptedCycle;
  cycles: DecryptedCycle[];
  isLatest: boolean;
  onConfirm: (id: string, payload: CyclePayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditPeriodSheet({ open, onClose, cycle, cycles, isLatest, onConfirm, onDelete }: Props) {
  const today = toISODate(new Date());

  const [startDate, setStartDate] = useState(cycle.payload.periodStart);
  const [ended, setEnded] = useState(cycle.payload.periodEnd !== null);
  const [endDate, setEndDate] = useState(cycle.payload.periodEnd ?? today);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setStartDate(cycle.payload.periodStart);
      setEnded(cycle.payload.periodEnd !== null);
      setEndDate(cycle.payload.periodEnd ?? today);
      setSaving(false);
      setConfirmingDelete(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cycle]);

  const effectiveEnd = ended ? endDate : today;

  // A past cycle can't be left "still going" — only the most recent cycle can be open.
  const showEndedToggle = isLatest;

  // Overlap check against every other logged cycle.
  const overlapsOtherCycle = cycles.some((c) => {
    if (c.id === cycle.id) return false;
    const otherStart = c.payload.periodStart;
    const otherEnd = c.payload.periodEnd ?? today;
    return startDate <= otherEnd && effectiveEnd >= otherStart;
  });

  const orderInvalid = ended && endDate < startDate;
  const rangeInvalid = startDate > today || (ended && endDate > today);
  const confirmDisabled = saving || orderInvalid || rangeInvalid || overlapsOtherCycle;

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm(cycle.id, {
        ...cycle.payload,
        periodStart: startDate,
        periodEnd: ended ? endDate : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await onDelete(cycle.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  let errorMessage: string | null = null;
  if (orderInvalid) errorMessage = 'End date must be after the start date.';
  else if (rangeInvalid) errorMessage = "Dates can't be in the future.";
  else if (overlapsOtherCycle) errorMessage = 'These dates overlap with another logged period.';

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-6 pt-4 pb-2 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Edit period</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-foreground-muted)' }}>
              Adjust the start or end date for this period.
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

        {/* Start date */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: 'var(--color-foreground-muted)' }}>
            Started
          </p>
          <div className="rounded-[var(--radius-sm)] px-4 py-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <input
              type="date"
              value={startDate}
              max={today}
              onChange={(e) => {
                const val = e.target.value;
                if (!val || val > today) return;
                setStartDate(val);
                if (ended && endDate < val) setEndDate(val);
              }}
              className="w-full bg-transparent text-base font-medium focus:outline-none"
              style={{ color: 'var(--color-foreground)', colorScheme: 'auto' }}
            />
          </div>
        </div>

        {/* Has it ended? */}
        {showEndedToggle && (
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
                      border: `1.5px solid ${active ? 'var(--color-accent)' : 'transparent'}`,
                      color: active ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* End date */}
        {ended && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--color-foreground-muted)' }}>
              Ended
            </p>
            <div className="rounded-[var(--radius-sm)] px-4 py-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
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

        {errorMessage && (
          <p className="text-xs -mt-2" style={{ color: 'var(--color-phase-period)' }}>{errorMessage}</p>
        )}

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
          {saving ? 'Saving…' : 'Save changes'}
        </button>

        {/* Delete */}
        {confirmingDelete ? (
          <div className="flex gap-2 -mt-2">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold disabled:opacity-50"
              style={{ background: 'color-mix(in srgb, var(--color-phase-period) 15%, transparent)', color: 'var(--color-phase-period)' }}
            >
              {saving ? 'Deleting…' : 'Yes, delete this period'}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold"
              style={{ background: 'var(--color-surface)', color: 'var(--color-foreground-muted)', border: '1px solid var(--color-border)' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-xs -mt-2 opacity-40 hover:opacity-70 text-center"
          >
            Delete this period log
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
