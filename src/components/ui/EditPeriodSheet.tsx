'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/SheetHeader';
import { DateField } from '@/components/ui/DateField';
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
  // Key on cycle.id, not the cycle object: a background refetch (realtime / visibility)
  // rebuilds the cycles array with new object identities, and depending on the object
  // here would reset the form and wipe the user's in-progress edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cycle.id]);

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
        <SheetHeader title="Edit period" subtitle="Adjust the start or end date for this period." onClose={onClose} />

        {/* Start date */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: 'var(--color-foreground-muted)' }}>
            Started
          </p>
          <DateField
            value={startDate}
            max={today}
            onChange={(val) => {
              if (!val || val > today) return;
              setStartDate(val);
              if (ended && endDate < val) setEndDate(val);
            }}
          />
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
            <DateField
              value={endDate}
              min={startDate}
              max={today}
              onChange={(val) => setEndDate(val)}
            />
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
          className="w-full py-3.5 rounded-full text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)', transition: 'transform 0.08s ease' }}
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
              style={{ background: 'var(--color-surface)', color: 'var(--color-foreground-muted)', boxShadow: 'inset 0 0 0 1px var(--color-border)' }}
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
