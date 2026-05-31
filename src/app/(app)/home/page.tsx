'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme/context';
import { useAppData } from '@/lib/data/context';
import { PhaseRing } from '@/components/ui/PhaseRing';
import { Toast, useToast } from '@/components/ui/Toast';
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

const PHASE_WARMTH: Record<string, string> = {
  period: 'Be soft with yourself today.',
  follicular: 'Something new is stirring.',
  ovulation: 'You\'re at your most radiant.',
  luteal: 'Slow down, you\'ve earned it.',
};

const TODAY = toISODate(new Date());
const DISPLAY_SYMPTOMS = SYMPTOMS.slice(0, 8);

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const { cycles, logs, prediction, upsertLog, addCycle, updateCycle } = useAppData();
  const { toastMsg, showToast } = useToast();

  const openCycle = cycles.find(c => !c.payload.periodEnd) ?? null;
  const todayLog = logs.find((l) => l.payload.date === TODAY);
  const [mood, setMood] = useState<MoodLevel | null>(todayLog?.payload.mood ?? null);
  const [flow, setFlow] = useState<FlowIntensity>(todayLog?.payload.flow ?? 'none');
  const [symptoms, setSymptoms] = useState<string[]>(todayLog?.payload.symptoms ?? []);
  const [saving, setSaving] = useState(false);
  const [periodError, setPeriodError] = useState('');

  useEffect(() => {
    if (todayLog) {
      setMood(todayLog.payload.mood);
      setFlow(todayLog.payload.flow);
      setSymptoms(todayLog.payload.symptoms);
    }
  }, [todayLog]);

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function startPeriod() {
    setPeriodError('');
    setSaving(true);
    try {
      await addCycle({ periodStart: TODAY, periodEnd: null, flowIntensity: 'medium', notes: '' });
      setFlow('medium');
      showToast('Period started — tracking day 1 🩸');
    } catch {
      setPeriodError('Couldn\'t start period — please try again.');
    } finally {
      setSaving(false);
    }
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
        flow: openCycle ? flow : 'none',
        notes: todayLog?.payload.notes ?? '',
      });

      // Auto-close: flow='none' + open cycle started ≥ 2 days ago
      if (openCycle && flow === 'none') {
        const daysDiff = Math.round(
          (new Date().getTime() - new Date(openCycle.payload.periodStart).getTime()) / 86400000
        );
        if (daysDiff >= 2) {
          const lastFlowLog = [...logs]
            .filter(l => l.payload.date !== TODAY && l.payload.flow && l.payload.flow !== 'none')
            .sort((a, b) => b.payload.date.localeCompare(a.payload.date))[0];
          const periodEnd = lastFlowLog?.payload.date ?? openCycle.payload.periodStart;
          await updateCycle(openCycle.id, { ...openCycle.payload, periodEnd });
          showToast('Period ended — cycle logged ✓');
          return;
        }
      }

      showToast(todayLog ? 'Check-in updated ✓' : 'Check-in saved ✓');
    } catch {
      showToast('Something went wrong — try again');
    } finally {
      setSaving(false);
    }
  }

  const periodDayCount = openCycle
    ? Math.round((new Date().getTime() - new Date(openCycle.payload.periodStart).getTime()) / 86400000) + 1
    : 0;

  const meta = PHASE_META[prediction.currentPhase];
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const userName = (() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('nila-prefs') ?? '{}');
      return (prefs.name as string | null) ?? null;
    } catch { return null; }
  })();

  const hour = today.getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greeting = userName ? `${timeGreeting}, ${userName}` : 'Nila';

  const daysLabel = prediction.daysUntilNextPeriod > 1
    ? `${prediction.daysUntilNextPeriod} days away`
    : prediction.daysUntilNextPeriod === 1
    ? 'tomorrow'
    : prediction.daysUntilNextPeriod === 0
    ? 'today'
    : `${Math.abs(prediction.daysUntilNextPeriod)} days late`;

  return (
    <div className="px-5 pt-4 pb-28 flex flex-col gap-5">
      <Toast message={toastMsg ?? ''} visible={!!toastMsg} />

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-foreground-muted)' }}>{dateStr}</p>
        </div>
        <button
          onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onPointerUp={(e) => e.currentTarget.style.transform = ''}
          onPointerLeave={(e) => e.currentTarget.style.transform = ''}
          onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)', transition: 'transform 0.08s ease' }}
        >
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '◐'}
        </button>
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
            {PHASE_WARMTH[prediction.currentPhase] ?? meta.description}
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--color-foreground-muted)' }}>
            Day {prediction.dayInPhase} of {prediction.estimatedCycleLength} · period {daysLabel}
          </div>
        </div>
      </div>

      {/* Next period pill */}
      <div
        className="rounded-[var(--radius-sm)] px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <span className="text-xl">🗓</span>
        <div>
          <div className="text-xs font-medium">Next period</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-foreground-muted)' }}>
            ±{prediction.nextPeriodConfidenceRange} day{prediction.nextPeriodConfidenceRange !== 1 ? 's' : ''} confidence
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
              onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onPointerUp={(e) => e.currentTarget.style.transform = ''}
              onPointerLeave={(e) => e.currentTarget.style.transform = ''}
              onClick={() => setMood(value)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[var(--radius-sm)] text-xl"
              style={{
                background: 'var(--color-surface)',
                border: `2px solid ${mood === value ? 'var(--color-accent)' : 'transparent'}`,
                opacity: mood && mood !== value ? 0.45 : 1,
                transition: 'transform 0.08s ease, border-color 0.1s, opacity 0.1s',
              }}
            >
              {emoji}
              <span className="text-[9px] font-semibold" style={{ color: 'var(--color-foreground-muted)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Period / Flow */}
      {openCycle ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold tracking-widest uppercase"
              style={{ color: 'var(--color-foreground-muted)' }}>
              Flow today
            </p>
            <span className="text-xs font-medium" style={{ color: PHASE_META.period.color }}>
              Period day {periodDayCount}
            </span>
          </div>
          <div className="flex gap-1.5">
            {FLOWS.map(({ value, label }) => (
              <button
                key={value}
                onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                onPointerUp={(e) => e.currentTarget.style.transform = ''}
                onPointerLeave={(e) => e.currentTarget.style.transform = ''}
                onClick={() => setFlow(value)}
                className="flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-medium"
                style={{
                  background: 'var(--color-surface)',
                  border: `1.5px solid ${flow === value ? 'var(--color-accent)' : 'transparent'}`,
                  opacity: flow !== value ? 0.55 : 1,
                  color: flow === value ? 'var(--color-accent)' : undefined,
                  transition: 'transform 0.08s ease, border-color 0.1s, opacity 0.1s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {flow === 'none' && periodDayCount >= 2 && (
            <p className="text-xs mt-2" style={{ color: 'var(--color-foreground-muted)' }}>
              Saving &apos;None&apos; will close this cycle.
            </p>
          )}
        </div>
      ) : (
        <div>
          <button
            onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onPointerUp={(e) => e.currentTarget.style.transform = ''}
            onPointerLeave={(e) => e.currentTarget.style.transform = ''}
            onClick={startPeriod}
            disabled={saving}
            className="w-full py-3.5 rounded-[var(--radius)] text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              transition: 'transform 0.08s ease',
            }}
          >
            {saving ? (
              <span style={{ color: 'var(--color-foreground-muted)' }}>Starting…</span>
            ) : (
              <><span>🩸</span><span>My period started today</span></>
            )}
          </button>
          {periodError && (
            <p className="text-xs mt-2 text-red-400">{periodError}</p>
          )}
        </div>
      )}

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
              onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.93)'}
              onPointerUp={(e) => e.currentTarget.style.transform = ''}
              onPointerLeave={(e) => e.currentTarget.style.transform = ''}
              onClick={() => toggleSymptom(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: symptoms.includes(s) ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                border: `1.5px solid ${symptoms.includes(s) ? 'var(--color-accent)' : 'transparent'}`,
                color: symptoms.includes(s) ? 'var(--color-accent)' : undefined,
                opacity: !symptoms.includes(s) ? 0.6 : 1,
                transition: 'transform 0.08s ease, border-color 0.1s, opacity 0.1s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      {mood && (
        <button
          onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
          onPointerUp={(e) => e.currentTarget.style.transform = ''}
          onPointerLeave={(e) => e.currentTarget.style.transform = ''}
          onClick={save}
          disabled={saving}
          className="w-full py-3.5 rounded-[var(--radius)] text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--color-accent)', color: '#fff', transition: 'transform 0.08s ease' }}
        >
          {saving ? 'Saving…' : todayLog ? 'Update check-in' : 'Save check-in'}
        </button>
      )}
    </div>
  );
}
