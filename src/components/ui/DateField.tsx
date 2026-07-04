'use client';

// An in-app date picker, so choosing a date stays in Nila's own calm calendar
// instead of dropping to the OS date wheel. Drop-in for the native
// <input type="date">: pass an ISO 'YYYY-MM-DD' value plus optional min/max, get
// an ISO string back from onChange. The calendar expands inline below the field
// (no nested sheet), so it works anywhere, including inside another sheet.
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DateField({
  value,
  onChange,
  min,
  max,
  placeholder = 'Pick a date',
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const selected = parseISO(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => selected ?? new Date());

  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  const label = selected
    ? selected.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : placeholder;

  function disabled(day: Date): boolean {
    if (minDate && day < minDate) return true;
    if (maxDate && day > maxDate) return true;
    return false;
  }

  // Build the visible month grid (leading blanks so the 1st lands on its weekday).
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstDay.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const canPrev = !minDate || new Date(year, month, 1) > new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const canNext = !maxDate || new Date(year, month, 1) < new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-[var(--radius-sm)] px-4 py-3 text-left"
        style={{
          background: 'var(--color-surface)',
          boxShadow: open ? 'inset 0 0 0 1.5px var(--color-accent)' : 'inset 0 0 0 1px var(--color-border)',
        }}
      >
        <span className="text-base font-medium" style={{ color: selected ? 'var(--color-foreground)' : 'var(--color-foreground-muted)' }}>
          {label}
        </span>
        <span className="text-sm" style={{ color: 'var(--color-foreground-muted)' }}>📅</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-[var(--radius-sm)] p-3" style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={() => setView(new Date(year, month - 1, 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-25"
                  style={{ color: 'var(--color-foreground)' }}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                  {view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => setView(new Date(year, month + 1, 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-25"
                  style={{ color: 'var(--color-foreground)' }}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS.map((w, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--color-foreground-muted)' }}>
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const isSel = selected && sameDay(day, selected);
                  const isDisabled = disabled(day);
                  const isToday = sameDay(day, new Date());
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        onChange(toISO(day));
                        setOpen(false);
                      }}
                      className="aspect-square rounded-full text-sm flex items-center justify-center disabled:opacity-20"
                      style={{
                        background: isSel ? 'var(--color-accent)' : 'transparent',
                        color: isSel ? 'var(--color-on-accent)' : 'var(--color-foreground)',
                        fontWeight: isSel || isToday ? 700 : 500,
                        boxShadow: !isSel && isToday ? 'inset 0 0 0 1.5px var(--color-accent-soft)' : 'none',
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
