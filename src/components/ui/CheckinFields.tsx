'use client';

import type { ReactNode } from 'react';
import { MOODS, FLOWS, SYMPTOMS } from '@/types/app';
import type { MoodLevel, FlowIntensity } from '@/types/app';

// Shared check-in inputs used by both the home screen and the journal entry
// screen. Previously each screen hand-rolled identical mood / flow / symptom
// grids, so a styling or behaviour change had to be made in two places.

const pressDown = (e: React.PointerEvent<HTMLButtonElement>, scale = 0.9) => {
  e.currentTarget.style.transform = `scale(${scale})`;
};
const pressUp = (e: React.PointerEvent<HTMLButtonElement>) => {
  e.currentTarget.style.transform = '';
};

export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`text-[11px] font-semibold tracking-widest uppercase ${className}`}
      style={{ color: 'var(--color-foreground-muted)' }}
    >
      {children}
    </p>
  );
}

export function MoodSelector({ value, onChange }: { value: MoodLevel | null; onChange: (m: MoodLevel) => void }) {
  return (
    <div className="flex gap-2">
      {MOODS.map(({ value: v, emoji, label }) => (
        <button
          key={v}
          onPointerDown={(e) => pressDown(e)}
          onPointerUp={pressUp}
          onPointerLeave={pressUp}
          onClick={() => onChange(v)}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[var(--radius-sm)] text-xl"
          style={{
            background: 'var(--color-surface)',
            boxShadow: value === v ? 'inset 0 0 0 2px var(--color-accent)' : 'none',
            opacity: value && value !== v ? 0.45 : 1,
            transition: 'transform 0.08s ease, box-shadow 0.1s, opacity 0.1s',
          }}
        >
          {emoji}
          <span className="text-[9px] font-semibold" style={{ color: 'var(--color-foreground-muted)' }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function FlowSelector({ value, onChange }: { value: FlowIntensity; onChange: (f: FlowIntensity) => void }) {
  return (
    <div className="flex gap-1.5">
      {FLOWS.map(({ value: v, label }) => (
        <button
          key={v}
          onPointerDown={(e) => pressDown(e)}
          onPointerUp={pressUp}
          onPointerLeave={pressUp}
          onClick={() => onChange(v)}
          className="flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-medium"
          style={{
            background: 'var(--color-surface)',
            boxShadow: value === v ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
            opacity: value !== v ? 0.55 : 1,
            color: value === v ? 'var(--color-accent)' : undefined,
            transition: 'transform 0.08s ease, box-shadow 0.1s, opacity 0.1s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SymptomPicker({ selected, onToggle }: { selected: string[]; onToggle: (s: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SYMPTOMS.map((s) => {
        const active = selected.includes(s);
        return (
          <button
            key={s}
            onPointerDown={(e) => pressDown(e, 0.93)}
            onPointerUp={pressUp}
            onPointerLeave={pressUp}
            onClick={() => onToggle(s)}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: active ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              boxShadow: active ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
              color: active ? 'var(--color-accent)' : undefined,
              opacity: active ? 1 : 0.6,
              transition: 'transform 0.08s ease, box-shadow 0.1s, opacity 0.1s',
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
