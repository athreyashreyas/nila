'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '@/lib/theme/context';
import { useAppData } from '@/lib/data/context';
import { PhaseRing } from '@/components/ui/PhaseRing';
import { Toast, useToast } from '@/components/ui/Toast';
import { PHASE_META, SYMPTOMS } from '@/types/app';
import type { MoodLevel, FlowIntensity, CyclePhase } from '@/types/app';
import { toISODate } from '@/lib/utils/dates';

// ─── Constants ────────────────────────────────────────────────

const TODAY = toISODate(new Date());
const DRAFT_KEY = `nila-draft-${TODAY}`;
const SESSION_KEY = `nila-session-synced-${TODAY}`;

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

const ENERGY_LABELS = ['', 'Drained', 'Low', 'Okay', 'Good', 'Vibrant'] as const;

const PHASE_GREETINGS: Record<CyclePhase, { emoji: string; line: string }> = {
  period:     { emoji: '🌸', line: 'Your body is doing something extraordinary.' },
  follicular: { emoji: '✨', line: 'Something new is quietly taking shape.' },
  ovulation:  { emoji: '🌷', line: 'At your most radiant — let the world feel it.' },
  luteal:     { emoji: '🌙', line: 'Quiet strength carries you through.' },
};

const PHASE_FOCUS: Record<CyclePhase, string> = {
  period:     'Warmth, rest, and gentleness. Your body is doing real work — give it space.',
  follicular: 'Clarity is returning. A great time to start things, plan, and reconnect with what you want.',
  ovulation:  'Peak social energy. High-stakes conversations, creative bursts, bold decisions — all easier now.',
  luteal:     'Intuition is sharper now. Reflect, create quietly, and honour the slower rhythm.',
};

// ─── Hormone graph ─────────────────────────────────────────────

const E2  = [[0,.12],[.18,.18],[.36,.55],[.46,.96],[.50,.58],[.57,.42],[.64,.58],[.75,.50],[.89,.26],[1,.12]] as [number,number][];
const P4  = [[0,.06],[.46,.06],[.50,.12],[.57,.32],[.64,.88],[.71,.95],[.79,.68],[.89,.22],[1,.06]] as [number,number][];
const LH  = [[0,.06],[.43,.07],[.46,.45],[.50,1.0],[.54,.22],[.58,.07],[1,.06]] as [number,number][];

function lerp2(t: number, ctrl: [number,number][]): number {
  const c = Math.max(0, Math.min(1, t));
  for (let i = 1; i < ctrl.length; i++) {
    if (c <= ctrl[i][0]) {
      const [x0,y0] = ctrl[i-1], [x1,y1] = ctrl[i];
      return y0 + ((c - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return ctrl[ctrl.length-1][1];
}

function HormoneGraph({ dayInCycle, cycleLength, estimatedPeriodLength }: {
  dayInCycle: number;
  cycleLength: number;
  estimatedPeriodLength: number;
}) {
  const W = 320, H = 72, PX = 8, PY = 6;
  const iW = W - PX * 2, iH = H - PY * 2;
  const xP = (d: number) => PX + ((d - 1) / Math.max(cycleLength - 1, 1)) * iW;
  const yP = (v: number) => PY + (1 - v) * iH;
  const N = cycleLength;
  const days = Array.from({ length: N }, (_, i) => i + 1);

  function pathFor(ctrl: [number,number][]) {
    return 'M ' + days.map(d => {
      const t = (d - 1) / Math.max(N - 1, 1);
      return `${xP(d).toFixed(1)},${yP(lerp2(t, ctrl)).toFixed(1)}`;
    }).join(' L ');
  }

  const cur = Math.max(1, Math.min(dayInCycle, N));
  const curT = (cur - 1) / Math.max(N - 1, 1);
  const cx = xP(cur);

  const pEnd = xP(Math.min(estimatedPeriodLength, N));
  const ovD = N - 14;
  const fEnd = xP(Math.max(1, ovD - 2));
  const oEnd = xP(Math.min(N, ovD + 2));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
        {/* Phase bands */}
        <rect x={PX} y={PY} width={Math.max(0, pEnd - PX)} height={iH} fill="#f43f5e" fillOpacity={0.10} rx={2} />
        <rect x={pEnd} y={PY} width={Math.max(0, fEnd - pEnd)} height={iH} fill="#f59e0b" fillOpacity={0.09} rx={2} />
        <rect x={fEnd} y={PY} width={Math.max(0, oEnd - fEnd)} height={iH} fill="#f97316" fillOpacity={0.11} rx={2} />
        <rect x={oEnd} y={PY} width={Math.max(0, PX + iW - oEnd)} height={iH} fill="#a78bfa" fillOpacity={0.10} rx={2} />
        {/* Curves */}
        <path d={pathFor(E2)} fill="none" stroke="#f06292" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor(P4)} fill="none" stroke="#c084fc" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor(LH)} fill="none" stroke="#fbbf24" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        {/* Today line */}
        <line x1={cx} y1={PY - 2} x2={cx} y2={H - PY + 2} stroke="var(--color-foreground)" strokeWidth={1} strokeDasharray="2,3" strokeOpacity={0.3} />
        {/* Today dots on E2 and P4 */}
        <circle cx={cx} cy={yP(lerp2(curT, E2))} r={3.5} fill="#f06292" />
        <circle cx={cx} cy={yP(lerp2(curT, P4))} r={3.5} fill="#c084fc" />
      </svg>
      <div className="flex items-center gap-4 mt-1.5 px-1">
        {[{ color: '#f06292', label: 'Oestrogen' }, { color: '#c084fc', label: 'Progesterone' }, { color: '#fbbf24', label: 'LH surge' }].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px]" style={{ color: 'var(--color-foreground-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Draft helpers ─────────────────────────────────────────────

function readDraft(): { mood?: MoodLevel; flow?: FlowIntensity; symptoms?: string[]; energy?: number } | null {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null'); }
  catch { return null; }
}

// ─── Home page ─────────────────────────────────────────────────

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const { cycles, logs, prediction, upsertLog, addCycle, updateCycle } = useAppData();
  const { toastMsg, showToast } = useToast();

  const openCycle = cycles.find(c => !c.payload.periodEnd) ?? null;
  const todayLog = logs.find((l) => l.payload.date === TODAY);

  const draft = readDraft();
  const [mood, setMood] = useState<MoodLevel | null>(draft?.mood ?? null);
  const [flow, setFlow] = useState<FlowIntensity>(draft?.flow ?? 'none');
  const [symptoms, setSymptoms] = useState<string[]>(draft?.symptoms ?? []);
  const [energy, setEnergy] = useState<number>(draft?.energy ?? 0);
  const [saving, setSaving] = useState(false);
  const [periodError, setPeriodError] = useState('');
  const serverSynced = useRef(false);

  // First-mount server sync: only if no session flag (fresh page load, not tab switch)
  useEffect(() => {
    if (todayLog && !serverSynced.current) {
      serverSynced.current = true;
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, '1');
        setMood(todayLog.payload.mood);
        setFlow(todayLog.payload.flow);
        setSymptoms(todayLog.payload.symptoms);
        setEnergy((todayLog.payload.energy as number | null) ?? 0);
      }
    }
  }, [todayLog]);

  // Persist draft to localStorage on every change
  const writeDraft = useCallback(() => {
    try {
      if (mood || flow !== 'none' || symptoms.length > 0 || energy > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ mood, flow, symptoms, energy }));
      }
    } catch {}
  }, [mood, flow, symptoms, energy]);

  useEffect(() => { writeDraft(); }, [writeDraft]);

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
        energy: (energy as 1|2|3|4|5|null) || null,
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
          localStorage.removeItem(DRAFT_KEY);
          showToast('Period ended — cycle logged ✓');
          return;
        }
      }

      localStorage.removeItem(DRAFT_KEY);
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
    try { return (JSON.parse(localStorage.getItem('nila-prefs') ?? '{}').name as string | null) ?? null; }
    catch { return null; }
  })();

  const hour = today.getHours();
  const timePrefix = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const phaseGreet = PHASE_GREETINGS[prediction.currentPhase];

  const daysLabel = prediction.daysUntilNextPeriod > 1
    ? `${prediction.daysUntilNextPeriod} days away`
    : prediction.daysUntilNextPeriod === 1 ? 'tomorrow'
    : prediction.daysUntilNextPeriod === 0 ? 'today'
    : `${Math.abs(prediction.daysUntilNextPeriod)} days late`;

  // Cycle day (estimated from prediction)
  const cycleDay = Math.max(1, prediction.estimatedCycleLength - prediction.daysUntilNextPeriod);

  return (
    <div className="px-5 pt-4 pb-28 flex flex-col gap-5">
      <Toast message={toastMsg ?? ''} visible={!!toastMsg} />

      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-foreground-muted)' }}>
            {timePrefix} {phaseGreet.emoji}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight leading-tight">
            {userName ?? 'Welcome'}
          </h1>
          <p className="font-display text-sm italic mt-0.5 leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>
            {phaseGreet.line}
          </p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-foreground-muted)', opacity: 0.7 }}>{dateStr}</p>
        </div>
        <button
          onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onPointerUp={(e) => e.currentTarget.style.transform = ''}
          onPointerLeave={(e) => e.currentTarget.style.transform = ''}
          onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ml-3 mt-0.5"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)', transition: 'transform 0.08s ease' }}
        >
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '◐'}
        </button>
      </div>

      {/* Phase card */}
      <div
        className="rounded-[var(--radius)] p-5"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex gap-4 items-center mb-4">
          <PhaseRing prediction={prediction} />
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl font-bold" style={{ color: meta.color }}>{meta.label}</div>
            <div className="text-sm mt-0.5 leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>
              Day {prediction.dayInPhase} of phase · Cycle day {cycleDay}
            </div>
            <div className="text-xs mt-1.5 flex items-center gap-1.5">
              <span style={{ color: 'var(--color-foreground-muted)' }}>Next period</span>
              <span className="font-semibold" style={{ color: meta.color }}>{daysLabel}</span>
            </div>
          </div>
        </div>

        {/* Hormone graph */}
        <div className="mt-1">
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
            Hormone activity · Day {cycleDay} of {prediction.estimatedCycleLength}
          </p>
          <HormoneGraph
            dayInCycle={cycleDay}
            cycleLength={prediction.estimatedCycleLength}
            estimatedPeriodLength={prediction.estimatedPeriodLength}
          />
        </div>
      </div>

      {/* Phase focus card */}
      <div
        className="rounded-[var(--radius-sm)] px-4 py-3"
        style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: meta.color }}>Today's focus</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
          {PHASE_FOCUS[prediction.currentPhase]}
        </p>
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

      {/* Energy */}
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3"
          style={{ color: 'var(--color-foreground-muted)' }}>
          Energy level {energy > 0 ? `· ${ENERGY_LABELS[energy]}` : ''}
        </p>
        <div className="flex gap-2">
          {[1,2,3,4,5].map((lvl) => (
            <button
              key={lvl}
              onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
              onPointerUp={(e) => e.currentTarget.style.transform = ''}
              onPointerLeave={(e) => e.currentTarget.style.transform = ''}
              onClick={() => setEnergy(energy === lvl ? 0 : lvl)}
              className="flex-1 flex flex-col items-end gap-0.5 px-2 py-2.5 rounded-[var(--radius-sm)]"
              style={{
                background: 'var(--color-surface)',
                border: `1.5px solid ${energy === lvl ? 'var(--color-accent)' : 'transparent'}`,
                transition: 'transform 0.08s ease, border-color 0.1s',
              }}
            >
              {[1,2,3,4,5].map(bar => (
                <div key={bar} className="w-full rounded-sm"
                  style={{
                    height: 3 + bar,
                    background: bar <= lvl && energy >= lvl
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                    opacity: bar <= lvl && energy >= lvl ? 1 : 0.35,
                    transition: 'background 0.1s, opacity 0.1s',
                  }}
                />
              ))}
              <span className="text-[9px] font-semibold mt-1 w-full text-center"
                style={{ color: energy === lvl ? 'var(--color-accent)' : 'var(--color-foreground-muted)' }}>
                {lvl}
              </span>
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
              Saving 'None' will close this cycle.
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
          {periodError && <p className="text-xs mt-2 text-red-400">{periodError}</p>}
        </div>
      )}

      {/* Symptoms */}
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3"
          style={{ color: 'var(--color-foreground-muted)' }}>
          Symptoms
        </p>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
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
