'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useEncryption } from '@/lib/encryption/context';
import { useCycles } from '@/hooks/useCycles';
import { useDailyLog } from '@/hooks/useDailyLog';
import { usePrediction } from '@/hooks/usePrediction';
import { PhaseRing } from '@/components/ui/PhaseRing';
import { PHASE_META, SYMPTOMS } from '@/types/app';
import type { MoodLevel, FlowIntensity } from '@/types/app';
import { toISODate } from '@/lib/utils/dates';

const MOODS: { value: MoodLevel; emoji: string; label: string }[] = [
  { value: 'great',      emoji: '😊', label: 'Great' },
  { value: 'good',       emoji: '🙂', label: 'Good' },
  { value: 'okay',       emoji: '😐', label: 'Okay' },
  { value: 'low',        emoji: '😔', label: 'Low' },
  { value: 'low-energy', emoji: '😴', label: 'Tired' },
];

const FLOWS: { value: FlowIntensity; label: string }[] = [
  { value: 'none',     label: 'None' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'light',    label: 'Light' },
  { value: 'medium',   label: 'Medium' },
  { value: 'heavy',    label: 'Heavy' },
];

const TODAY = toISODate(new Date());

const DISPLAY_SYMPTOMS = SYMPTOMS.slice(0, 8);

export default function HomePage() {
  const { isUnlocked } = useEncryption();
  const { cycles, fetchAll: fetchCycles } = useCycles();
  const { logs, fetchAll: fetchLogs, upsertLog } = useDailyLog();
  const prediction = usePrediction(cycles);

  const todayLog = logs.find((l) => l.payload.date === TODAY);
  const [mood, setMood] = useState<MoodLevel | null>(todayLog?.payload.mood ?? null);
  const [flow, setFlow] = useState<FlowIntensity>(todayLog?.payload.flow ?? 'none');
  const [symptoms, setSymptoms] = useState<string[]>(todayLog?.payload.symptoms ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      fetchCycles();
      fetchLogs();
    }
  }, [isUnlocked, fetchCycles, fetchLogs]);

  useEffect(() => {
    if (todayLog) {
      setMood(todayLog.payload.mood);
      setFlow(todayLog.payload.flow);
      setSymptoms(todayLog.payload.symptoms);
    }
  }, [todayLog]);

  function toggleSymptom(s: string) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function save() {
    if (!mood) return;
    setSaving(true);
    try {
      await upsertLog({
        date: TODAY,
        mood,
        energy: null,
        symptoms,
        flow,
        notes: todayLog?.payload.notes ?? '',
      });
    } finally {
      setSaving(false);
    }
  }

  const meta = PHASE_META[prediction.currentPhase];
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-screen opacity-40 text-sm">
        Unlocking…
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-28 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nila</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-foreground-muted)' }}>{dateStr}</p>
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
        >
          🌙
        </div>
      </div>

      {/* Phase card */}
      <div
        className="rounded-[var(--radius)] p-5 flex gap-4 items-center"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <PhaseRing prediction={prediction} />
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold" style={{ color: meta.color }}>{meta.label}</div>
          <div className="text-sm mt-0.5 leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>
            {meta.description}
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--color-foreground-muted)' }}>
            Day {prediction.dayInPhase} · next period in{' '}
            {prediction.daysUntilNextPeriod > 0
              ? `${prediction.daysUntilNextPeriod} days`
              : 'overdue'}
          </div>
        </div>
      </div>

      {/* Prediction pill */}
      <div
        className="rounded-[var(--radius-sm)] px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <span className="text-xl">🗓</span>
        <div>
          <div className="text-xs" style={{ color: 'var(--color-foreground-muted)' }}>Next period</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-foreground-muted)' }}>
            ±{prediction.nextPeriodConfidenceRange} days
          </div>
        </div>
        <div className="ml-auto font-semibold text-sm">
          {prediction.nextPeriodDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* Mood */}
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3"
          style={{ color: 'var(--color-foreground-muted)' }}>
          How are you feeling?
        </p>
        <div className="flex gap-2">
          {MOODS.map(({ value, emoji, label }) => (
            <button
              key={value}
              onClick={() => setMood(value)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[var(--radius-sm)] text-xl transition-all"
              style={{
                background: 'var(--color-surface)',
                border: `2px solid ${mood === value ? 'var(--color-accent)' : 'transparent'}`,
                opacity: mood && mood !== value ? 0.45 : 1,
              }}
            >
              {emoji}
              <span className="text-[9px] font-semibold" style={{ color: 'var(--color-foreground-muted)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Flow */}
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3"
          style={{ color: 'var(--color-foreground-muted)' }}>
          Flow
        </p>
        <div className="flex gap-1.5">
          {FLOWS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFlow(value)}
              className="flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-medium transition-all"
              style={{
                background: 'var(--color-surface)',
                border: `1.5px solid ${flow === value ? 'var(--color-accent)' : 'transparent'}`,
                opacity: flow !== value ? 0.55 : 1,
                color: flow === value ? 'var(--color-accent)' : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Symptoms */}
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3"
          style={{ color: 'var(--color-foreground-muted)' }}>
          Symptoms
        </p>
        <div className="flex flex-wrap gap-2">
          {DISPLAY_SYMPTOMS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSymptom(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: symptoms.includes(s) ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                border: `1.5px solid ${symptoms.includes(s) ? 'var(--color-accent)' : 'transparent'}`,
                color: symptoms.includes(s) ? 'var(--color-accent)' : undefined,
                opacity: !symptoms.includes(s) ? 0.6 : 1,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      {mood && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3.5 rounded-[var(--radius)] text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {saving ? 'Saving…' : todayLog ? 'Update check-in' : 'Save check-in'}
        </button>
      )}
    </div>
  );
}
