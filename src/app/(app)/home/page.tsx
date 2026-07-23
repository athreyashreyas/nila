'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '@/lib/data/context';
import { PhaseRing } from '@/components/ui/PhaseRing';
import { Toast, useToast } from '@/components/ui/Toast';
import { SmartLogSheet } from '@/components/ui/SmartLogSheet';
import { EndPeriodSheet } from '@/components/ui/EndPeriodSheet';
import { SectionLabel, MoodSelector, FlowSelector, SymptomPicker } from '@/components/ui/CheckinFields';
import { DropletIcon } from '@/components/ui/icons';
import { PHASE_META, tint } from '@/types/app';
import type { MoodLevel, FlowIntensity, CyclePhase } from '@/types/app';
import { toISODate, fromISODate, daysBetween, startOfDay } from '@/lib/utils/dates';
import { phaseForCycleDay } from '@/lib/algorithm/prediction';
import { getDailyInsight } from '@/lib/insights/engine';
import { pick, pickDaily, TOAST } from '@/lib/copy/phrases';

// ─── Module-level store ──────────────────────────────────────
// Survives SPA tab-switching (module stays loaded); resets on full page reload.
// _lastLogId tracks which server log version we last synced from — when it changes
// (new save or cross-device update) we re-sync from server automatically.
const _store = {
  mood: null as MoodLevel | null,
  flow: 'none' as FlowIntensity,
  symptoms: [] as string[],
  energy: 0,
};
let _lastLogId = '';

// ─── Constants ────────────────────────────────────────────────

const ENERGY_LABELS = ['', 'Drained', 'Low', 'Okay', 'Good', 'Vibrant'] as const;

const PHASE_LINES: Record<CyclePhase, string[]> = {
  period: [
    'Your body is doing something extraordinary.',
    'Rest is not weakness. It\'s your superpower right now.',
    'Be softer with yourself than you think you need to be.',
    'You are allowed to take it slow today.',
    'Give yourself the grace you\'d give someone you love.',
    'This too is part of the cycle. You are whole.',
    'Warmth and rest. That\'s the assignment today.',
    'Not every day needs to be productive. Today, just be.',
    'Your body is asking for gentleness. Listen.',
    'Strength looks like rest today.',
    'Slow mornings are a love language. Try one on yourself.',
    'You have nothing to prove today. Just be here.',
    'Wrap yourself in warmth and let the day be soft.',
    'Your only job today is to be kind to you.',
    'Lean into rest. It\'s where your strength refills.',
    'However today feels, you\'re handling it beautifully.',
    'A hot water bottle and a quiet hour count as self-care.',
    'Let the to-do list wait. You come first today.',
  ],
  follicular: [
    'Something new is quietly taking shape.',
    'New energy is building. Lean into the clarity.',
    'The fog is lifting. Notice how sharp things feel.',
    'Fresh starts live here. What\'s been waiting for you?',
    'This is the season of beginnings.',
    'You\'re coming back to yourself, steadily and surely.',
    'Ideas are sharper, energy is returning. Use it well.',
    'A wonderful time to start what you\'ve been putting off.',
    'Your mind is clear, your body is ready.',
    'Something is unfolding. Stay curious.',
    'Your spark is back. Follow what lights you up.',
    'Possibility is in the air. Say yes to something.',
    'Momentum is on your side right now.',
    'A fresh page. Write something you\'re excited about.',
    'Your energy is rising. Ride the wave.',
    'Curiosity suits you. Chase a new idea today.',
    'Plant a seed today. This is the soil for it.',
    'You\'re building toward something good. Keep going.',
  ],
  ovulation: [
    'At your most radiant. Let the world feel it.',
    'Peak energy. Peak you. Make the most of it.',
    'You\'re magnetic right now. Use it wisely.',
    'Everything is a little easier and brighter today.',
    'You\'re glowing, and there\'s science behind that.',
    'The world feels more yours right now. It is.',
    'High stakes, big conversations: both feel easier right now.',
    'This warmth and clarity won\'t last. Savour it.',
    'Bold choices. Big energy. This is your moment.',
    'People feel your warmth today. Share it.',
    'You\'re luminous today. Let yourself be seen.',
    'Confidence comes easy now. Use it generously.',
    'Say the brave thing. Today can hold it.',
    'Your warmth is contagious. Spread a little.',
    'This is your spotlight moment. Step into it.',
    'Connection feels effortless right now. Reach out.',
    'Whatever you\'ve been waiting to ask, ask it today.',
    'You\'re in full bloom. Enjoy every bit of it.',
  ],
  luteal: [
    'Quiet strength carries you through.',
    'Your intuition is sharpest now. Trust it.',
    'The world can wait. This moment is yours.',
    'Slowing down isn\'t falling behind.',
    'Softer, slower, deeper. That\'s the energy today.',
    'You\'ve earned every moment of rest this phase brings.',
    'Honour the slower rhythm. It\'s not a weakness.',
    'Turn inward. The answers are already there.',
    'Your body knows what it needs. Listen closely.',
    'Creativity and reflection thrive here. Let them.',
    'Cosy is the assignment. Lean all the way in.',
    'Your inner world is rich right now. Visit it.',
    'Permission to do less, and feel good about it.',
    'Tend to yourself the way you tend to others.',
    'Quieter days have their own quiet magic.',
    'Let your pace be gentle. You\'ve earned it.',
    'Comfort is not indulgence right now. It\'s wisdom.',
    'Wrap the day in something soft and let it be enough.',
  ],
};

// One per phase rotates daily so the "Today's focus" card stays fresh across a cycle.
const PHASE_FOCUS: Record<CyclePhase, string[]> = {
  period: [
    'Warmth, rest, and gentleness. Your body is doing real work, so give it space.',
    'Permission to slow down. Today asks for softness, not output.',
    'Comfort first. Heat, rest, and nourishing food are exactly right.',
    'Be tender with yourself. Whatever you manage today is enough.',
  ],
  follicular: [
    'Clarity is returning. A great time to start things, plan, and reconnect with what you want.',
    'Fresh energy is here. Channel it into something you\'ve been meaning to begin.',
    'Your mind is sharp now. Tackle the things that need real thought.',
    'Momentum is building. Say yes to a new idea or plan.',
  ],
  ovulation: [
    'Peak social energy. High-stakes conversations, creative bursts, and bold decisions all feel easier now.',
    'You\'re at your most magnetic. Connect, create, and put yourself out there.',
    'Confidence runs high. A wonderful day for the brave thing.',
    'Your spark is at its brightest. Share it generously.',
  ],
  luteal: [
    'Intuition is sharper now. Reflect, create quietly, and honour the slower rhythm.',
    'Turn inward. This is a phase for depth, not speed.',
    'Tend and nest. Gentle routines feel especially good now.',
    'Honour the wind-down. Rest and reflection are productive too.',
  ],
};

// ─── Hormone graph ─────────────────────────────────────────────
// Curves render as true smooth splines (monotone cubic Hermite) through
// hand-placed control points, rather than a many-point straight-line
// polyline — so peaks and dips read as soft arcs, not jagged kinks.

const E2_CTRL = [[0,.12],[.18,.18],[.36,.55],[.46,.96],[.50,.58],[.57,.42],[.64,.58],[.75,.50],[.89,.26],[1,.12]] as [number,number][];
const P4_CTRL = [[0,.06],[.46,.06],[.50,.12],[.57,.32],[.64,.88],[.71,.95],[.79,.68],[.89,.22],[1,.06]] as [number,number][];
const LH_CTRL = [[0,.06],[.43,.07],[.46,.45],[.50,1.0],[.54,.22],[.58,.07],[1,.06]] as [number,number][];

const E2_COLOR = '#c98f3e';
const P4_COLOR = '#4a4e94';
const LH_COLOR = '#2e8a8a';

// Fritsch–Carlson monotone cubic Hermite tangents: the spline passes
// smoothly through every control point with no overshoot past a peak or dip.
function monotoneTangents(ctrl: [number, number][]): number[] {
  const n = ctrl.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = ctrl[i], [x1, y1] = ctrl[i + 1];
    d.push((y1 - y0) / (x1 - x0));
  }
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++) {
    m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  }
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i];
    if (a < 0) m[i] = 0;
    if (b < 0) m[i + 1] = 0;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * b * d[i];
    }
  }
  return m;
}

function segmentIndex(ctrl: [number, number][], t: number): number {
  let i = 1;
  while (i < ctrl.length - 1 && t > ctrl[i][0]) i++;
  return i;
}

function evalSpline(t: number, ctrl: [number, number][], tangents: number[]): number {
  const c = Math.max(0, Math.min(1, t));
  const i = segmentIndex(ctrl, c);
  const [x0, y0] = ctrl[i - 1], [x1, y1] = ctrl[i];
  const h = x1 - x0;
  const s = (c - x0) / h;
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  return h00 * y0 + h10 * h * tangents[i - 1] + h01 * y1 + h11 * h * tangents[i];
}

// Each segment between control points becomes one true cubic Bezier (the
// Hermite-to-Bezier conversion), so the path is analytically smooth rather
// than a dense sampled approximation.
function splinePath(
  ctrl: [number, number][],
  tangents: number[],
  toX: (t: number) => number,
  toY: (v: number) => number,
): string {
  let path = `M ${toX(ctrl[0][0]).toFixed(1)},${toY(ctrl[0][1]).toFixed(1)}`;
  for (let i = 1; i < ctrl.length; i++) {
    const [x0, y0] = ctrl[i - 1], [x1, y1] = ctrl[i];
    const h = x1 - x0;
    const c1x = x0 + h / 3, c1y = y0 + (tangents[i - 1] * h) / 3;
    const c2x = x1 - h / 3, c2y = y1 - (tangents[i] * h) / 3;
    path += ` C ${toX(c1x).toFixed(1)},${toY(c1y).toFixed(1)} ${toX(c2x).toFixed(1)},${toY(c2y).toFixed(1)} ${toX(x1).toFixed(1)},${toY(y1).toFixed(1)}`;
  }
  return path;
}

const E2_TAN = monotoneTangents(E2_CTRL);
const P4_TAN = monotoneTangents(P4_CTRL);
const LH_TAN = monotoneTangents(LH_CTRL);

function hormoneLabel(v: number): string {
  if (v < 0.18) return 'Very low';
  if (v < 0.38) return 'Low';
  if (v < 0.62) return 'Rising';
  if (v < 0.82) return 'High';
  return 'Peak';
}

function HormoneGraph({ dayInCycle, cycleLength, estimatedPeriodLength }: {
  dayInCycle: number;
  cycleLength: number;
  estimatedPeriodLength: number;
}) {
  const W = 320, H = 72, PX = 8, PY = 6;
  const iW = W - PX * 2, iH = H - PY * 2;
  const svgRef = useRef<SVGSVGElement>(null);
  const isDown = useRef(false);
  const [scrubDay, setScrubDay] = useState<number | null>(null);

  const N = cycleLength;
  const xP = (d: number) => PX + ((d - 1) / Math.max(N - 1, 1)) * iW;
  const yP = (v: number) => PY + (1 - v) * iH;
  const toX = (t: number) => PX + t * iW;

  function getDay(clientX: number): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return dayInCycle;
    const relX = (clientX - rect.left - PX) / (rect.width - PX * 2);
    return Math.max(1, Math.min(N, Math.round(relX * (N - 1)) + 1));
  }

  const displayDay = scrubDay ?? dayInCycle;
  const displayT = (displayDay - 1) / Math.max(N - 1, 1);
  const cx = xP(displayDay);
  const displayPhase = phaseForCycleDay(displayDay, N, estimatedPeriodLength);
  const phaseMeta = PHASE_META[displayPhase];

  const pEnd = xP(Math.min(estimatedPeriodLength, N));
  const ovD = N - 14;
  const fEnd = xP(Math.max(1, ovD - 2));
  const oEnd = xP(Math.min(N, ovD + 2));

  const e2Val = evalSpline(displayT, E2_CTRL, E2_TAN);
  const p4Val = evalSpline(displayT, P4_CTRL, P4_TAN);

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, touchAction: 'none', cursor: 'crosshair', userSelect: 'none' }}
        onPointerDown={(e) => {
          isDown.current = true;
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
          setScrubDay(getDay(e.clientX));
        }}
        onPointerMove={(e) => { if (isDown.current) setScrubDay(getDay(e.clientX)); }}
        onPointerUp={() => { isDown.current = false; setScrubDay(null); }}
        onPointerCancel={() => { isDown.current = false; setScrubDay(null); }}
      >
        {/* Phase bands */}
        <rect x={PX} y={PY} width={Math.max(0, pEnd - PX)} height={iH} fill="var(--color-phase-period)" fillOpacity={0.09} rx={3} />
        <rect x={pEnd} y={PY} width={Math.max(0, fEnd - pEnd)} height={iH} fill="var(--color-phase-follicular)" fillOpacity={0.08} rx={3} />
        <rect x={fEnd} y={PY} width={Math.max(0, oEnd - fEnd)} height={iH} fill="var(--color-phase-ovulation)" fillOpacity={0.10} rx={3} />
        <rect x={oEnd} y={PY} width={Math.max(0, PX + iW - oEnd)} height={iH} fill="var(--color-phase-luteal)" fillOpacity={0.09} rx={3} />
        {/* Curves — smooth splines, not sampled polylines */}
        <path d={splinePath(E2_CTRL, E2_TAN, toX, yP)} fill="none" stroke={E2_COLOR} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={splinePath(P4_CTRL, P4_TAN, toX, yP)} fill="none" stroke={P4_COLOR} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={splinePath(LH_CTRL, LH_TAN, toX, yP)} fill="none" stroke={LH_COLOR} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        {/* Active day line */}
        <line
          x1={cx} y1={PY - 2} x2={cx} y2={H - PY + 2}
          stroke={scrubDay ? phaseMeta.color : 'var(--color-foreground)'}
          strokeWidth={scrubDay ? 1.5 : 1}
          strokeDasharray="2,3"
          strokeOpacity={scrubDay ? 0.7 : 0.3}
        />
        {/* Dots on E2 and P4 */}
        <circle cx={cx} cy={yP(e2Val)} r={scrubDay ? 4.5 : 3.5} fill={E2_COLOR} />
        <circle cx={cx} cy={yP(p4Val)} r={scrubDay ? 4.5 : 3.5} fill={P4_COLOR} />
      </svg>

      {/* Info row: static legend or scrub overlay */}
      {scrubDay ? (
        <div className="flex items-center justify-between mt-1.5 px-1 gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: phaseMeta.color }} />
            <span className="text-[11px] font-semibold" style={{ color: phaseMeta.color }}>
              Day {scrubDay} · {phaseMeta.label}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-[10px]" style={{ color: E2_COLOR }}>E {hormoneLabel(e2Val)}</span>
            <span className="text-[10px]" style={{ color: P4_COLOR }}>P4 {hormoneLabel(p4Val)}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 mt-1.5 px-1">
          {[{ color: E2_COLOR, label: 'Oestrogen' }, { color: P4_COLOR, label: 'Progesterone' }, { color: LH_COLOR, label: 'LH surge' }].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded-full" style={{ background: color }} />
              <span className="text-[10px]" style={{ color: 'var(--color-foreground-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Phase timeline ────────────────────────────────────────────
// The whole cycle as four proportional segments, with a marker showing where
// today sits. Segment widths come from the user's own estimates, so a 24-day
// cycle and a 33-day one look genuinely different.

function PhaseTimeline({ cycleDay, cycleLength, periodLength }: {
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
}) {
  const luteal = 14;
  const ovulation = 5;
  const period = Math.min(periodLength, Math.max(1, cycleLength - luteal - ovulation - 1));
  const follicular = Math.max(1, cycleLength - period - ovulation - luteal);
  const total = period + follicular + ovulation + luteal;

  const segments: { phase: CyclePhase; days: number }[] = [
    { phase: 'period', days: period },
    { phase: 'follicular', days: follicular },
    { phase: 'ovulation', days: ovulation },
    { phase: 'luteal', days: luteal },
  ];

  const markerPct = Math.max(0, Math.min(100, (cycleDay / cycleLength) * 100));

  return (
    <div className="mt-5">
      <div className="relative">
        <div className="flex gap-[3px] h-2">
          {segments.map(({ phase, days }) => (
            <div
              key={phase}
              className="h-full rounded-full"
              style={{ width: `${(days / total) * 100}%`, background: tint(PHASE_META[phase].color, 55) }}
            />
          ))}
        </div>
        {/* Today's marker, riding on top of the segments */}
        <div
          className="absolute rounded-full"
          style={{
            left: `${markerPct}%`,
            top: -3,
            width: 3,
            height: 14,
            marginLeft: -1.5,
            background: 'var(--color-foreground)',
            transition: 'left 0.5s ease',
          }}
        />
      </div>
      <div className="flex gap-[3px] mt-1.5">
        {segments.map(({ phase, days }) => (
          <span
            key={phase}
            className="text-[8.5px] font-semibold tracking-wide text-center truncate"
            style={{ width: `${(days / total) * 100}%`, color: 'var(--color-foreground-muted)', opacity: 0.75 }}
          >
            {PHASE_META[phase].label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Home page ─────────────────────────────────────────────────

export default function HomePage() {
  const TODAY = toISODate(new Date());
  const { cycles, logs, prediction, upsertLog, deleteLog, addCycle, updateCycle, deleteCycle } = useAppData();
  const { toastMsg, showToast } = useToast();

  const openCycle = cycles.find(c => !c.payload.periodEnd) ?? null;
  const todayLog = logs.find((l) => l.payload.date === TODAY);

  // ─── Period status (5 explicit states) ──────────────────────
  type PeriodStatus = 'none' | 'approaching' | 'late' | 'active-today' | 'active-ongoing';
  const periodStatus: PeriodStatus = (() => {
    if (openCycle) {
      return openCycle.payload.periodStart === TODAY ? 'active-today' : 'active-ongoing';
    }
    if (prediction.daysUntilNextPeriod < 0) return 'late';
    if (prediction.daysUntilNextPeriod <= 3) return 'approaching';
    return 'none';
  })();

  // ─── Local UI state ──────────────────────────────────────────
  const [mood, setMood] = useState<MoodLevel | null>(_store.mood);
  const [flow, setFlow] = useState<FlowIntensity>(_store.flow);
  const [symptoms, setSymptoms] = useState<string[]>(_store.symptoms);
  const [energy, setEnergy] = useState<number>(_store.energy);
  const [saving, setSaving] = useState(false);
  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [endSheetOpen, setEndSheetOpen] = useState(false);

  // Sync from server when log ID changes (new save or cross-device update)
  useEffect(() => {
    const id = todayLog?.id ?? '';
    if (id !== _lastLogId) {
      _lastLogId = id;
      if (todayLog) {
        const m = todayLog.payload.mood ?? null;
        const f = todayLog.payload.flow ?? 'none';
        const s = todayLog.payload.symptoms ?? [];
        const e = (todayLog.payload.energy as number | null) ?? 0;
        setMood(m); setFlow(f); setSymptoms(s); setEnergy(e);
        _store.mood = m; _store.flow = f; _store.symptoms = s; _store.energy = e;
      } else {
        setMood(null); setFlow('none'); setSymptoms([]); setEnergy(0);
        _store.mood = null; _store.flow = 'none'; _store.symptoms = []; _store.energy = 0;
      }
    }
  }, [todayLog]);

  // Keep module store in sync with local state
  useEffect(() => { _store.mood = mood; }, [mood]);
  useEffect(() => { _store.flow = flow; }, [flow]);
  useEffect(() => { _store.symptoms = symptoms; }, [symptoms]);
  useEffect(() => { _store.energy = energy; }, [energy]);

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function logPeriod(startDate: string, endDate: string | null) {
    await addCycle({ periodStart: startDate, periodEnd: endDate, flowIntensity: 'medium', notes: '' });
    if (!endDate) {
      setFlow('medium');
      showToast(pick(TOAST.periodStarted));
    } else {
      showToast(pick(TOAST.periodLogged));
    }
  }

  async function endPeriod(endDate: string) {
    if (!openCycle) return;
    await updateCycle(openCycle.id, { ...openCycle.payload, periodEnd: endDate });
    showToast(pick(TOAST.periodEnded));
  }

  async function undoPeriod() {
    if (!openCycle) return;
    setSaving(true);
    try {
      await deleteCycle(openCycle.id);
      // Clear any flow already saved against today so the calendar dot
      // for today doesn't keep showing a "logged" entry for a removed period.
      if (todayLog && todayLog.payload.flow !== 'none') {
        const { mood: m, energy: e, symptoms: s, notes: n } = todayLog.payload;
        const isOtherwiseEmpty = !m && !e && s.length === 0 && !n;
        if (isOtherwiseEmpty) {
          await deleteLog(todayLog.id);
        } else {
          await upsertLog({ ...todayLog.payload, flow: 'none' });
        }
      }
      setFlow('none');
      showToast(pick(TOAST.periodRemoved));
    } catch {
      showToast(pick(TOAST.removeError));
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    // Nothing entered yet — nothing to save.
    if (!mood && energy === 0 && flow === 'none' && symptoms.length === 0) return;
    setSaving(true);
    try {
      await upsertLog({
        date: TODAY,
        mood: mood ?? null,
        energy: (energy as 1|2|3|4|5|null) || null,
        symptoms,
        flow: openCycle ? flow : 'none',
        notes: todayLog?.payload.notes ?? '',
      });
      showToast(pick(todayLog ? TOAST.checkinUpdated : TOAST.checkinSaved));
    } catch {
      showToast(pick(TOAST.saveError));
    } finally {
      setSaving(false);
    }
  }

  // ─── Derived display values ──────────────────────────────────

  // Whole calendar days since the period started (day 1 = start day), stable across
  // the whole day. The previous Math.round on a fractional-day diff flipped to the
  // next day every afternoon.
  const periodDayCount = openCycle
    ? daysBetween(fromISODate(openCycle.payload.periodStart), startOfDay(new Date())) + 1
    : 0;

  const meta = PHASE_META[prediction.currentPhase];
  const todayDate = new Date();
  const dateStr = todayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const userName = (() => {
    try { return (JSON.parse(localStorage.getItem('nila-prefs') ?? '{}').name as string | null) ?? null; }
    catch { return null; }
  })();

  const hour = todayDate.getHours();
  const timePrefix = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Pick a line for the current phase, stable within a phase but re-picked when the
  // phase changes. The previous useRef locked it to whatever phase was current on the
  // very first render (usually the pre-data-load default), so it could mismatch.
  const greetLine = useMemo(() => {
    const pool = PHASE_LINES[prediction.currentPhase];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [prediction.currentPhase]);

  const greetingName = userName ? `${timePrefix}, ${userName}` : timePrefix;

  // The hero headline: a big serif number and a quiet line under it. Overdue
  // cycles count up instead of down, so the number is always meaningful.
  const days = prediction.daysUntilNextPeriod;
  const headline = days === 0
    ? { figure: 'Today', caption: 'your period is expected' }
    : days > 0
      ? { figure: String(days), caption: days === 1 ? 'day until your period' : 'days until your period' }
      : { figure: String(Math.abs(days)), caption: Math.abs(days) === 1 ? 'day late' : 'days late' };

  // Clamp so overdue cycles don't push the active-day indicator past the graph edge
  const cycleDay = Math.min(
    prediction.estimatedCycleLength,
    Math.max(1, prediction.estimatedCycleLength - prediction.daysUntilNextPeriod),
  );

  const dailyInsight = getDailyInsight(
    prediction,
    todayLog?.payload.symptoms ?? symptoms,
    logs,
  );

  // ─── Period section button label ─────────────────────────────

  const logPeriodLabel = (() => {
    if (periodStatus === 'approaching') return 'Period due soon, log it';
    if (periodStatus === 'late') {
      const late = Math.abs(prediction.daysUntilNextPeriod);
      return `Period overdue by ${late} day${late === 1 ? '' : 's'}, log it`;
    }
    return 'Log period';
  })();

  return (
    <div className="px-5 pt-4 pb-28 flex flex-col gap-5">
      <Toast message={toastMsg ?? ''} visible={!!toastMsg} />

      {/* Smart log sheet */}
      <SmartLogSheet
        open={logSheetOpen}
        onClose={() => setLogSheetOpen(false)}
        prediction={prediction}
        onConfirm={logPeriod}
      />

      {/* End period sheet */}
      {openCycle && (
        <EndPeriodSheet
          open={endSheetOpen}
          onClose={() => setEndSheetOpen(false)}
          openCycle={openCycle}
          logs={logs}
          onConfirm={endPeriod}
        />
      )}

      {/* Compact top bar. pr-10 keeps the greeting clear of the sync dot pinned to
          the scroll area's top-right corner. */}
      <div className="pt-1 pr-10">
        <p className="text-[11px] tracking-wide" style={{ color: 'var(--color-foreground-muted)', opacity: 0.75 }}>
          {dateStr}
        </p>
        <h1 className="font-display text-[26px] tracking-tight leading-tight mt-0.5">
          {greetingName}
        </h1>
        <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>
          {greetLine}
        </p>
      </div>

      {/* Hero: where you are in your cycle, and how long until the next period.
          The largest thing on the screen, and the reason the app exists. */}
      <div className="rounded-[22px] p-5"
        style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
        {prediction.hasData ? (
          <>
            <span className="inline-block text-[10.5px] font-bold tracking-wide px-2.5 py-1 rounded-full"
              style={{ background: tint(meta.color, 15), color: meta.color }}>
              {meta.label}
            </span>

            <div className="flex items-center gap-4 mt-4">
              <PhaseRing prediction={prediction} size={112} />
              <div className="flex-1 min-w-0">
                <div className="font-display leading-none" style={{ fontSize: 40 }}>{headline.figure}</div>
                <p className="text-xs mt-2 leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>
                  {headline.caption}
                </p>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-foreground-muted)', opacity: 0.7 }}>
                  Cycle day {cycleDay} of {prediction.estimatedCycleLength}
                </p>
              </div>
            </div>

            <PhaseTimeline
              cycleDay={cycleDay}
              cycleLength={prediction.estimatedCycleLength}
              periodLength={prediction.estimatedPeriodLength}
            />
          </>
        ) : (
          <div className="flex flex-col items-center py-4 gap-3 text-center">
            {/* Light tile under the dancer: its cream ground needs paper beneath it. */}
            <span className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: '#fdfcf9' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/dancer.png" alt="" className="w-full h-full object-cover" />
            </span>
            <p className="text-sm font-semibold">Log your first period to get started</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
              Nila will learn your cycle and show personalised insights here.
            </p>
          </div>
        )}
      </div>

      {/* Today's focus. An editorial line, not a card, so it sits below the hero
          in the hierarchy while still reading as the day's headline thought. */}
      {prediction.hasData && (
        <div className="flex gap-3.5 pr-1">
          <div className="w-[3px] rounded-full flex-shrink-0" style={{ background: meta.color }} />
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: meta.color }}>
              Today's focus
            </p>
            <p className="font-display text-[19px] leading-snug mt-1.5">
              {pickDaily(PHASE_FOCUS[prediction.currentPhase])}
            </p>
          </div>
        </div>
      )}

      {/* Hormone activity, still the best thing to poke at on this screen. */}
      {prediction.hasData && (
        <div className="rounded-[var(--radius)] p-4"
          style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--color-foreground-muted)' }}>
            Hormone activity, drag to explore
          </p>
          <HormoneGraph
            dayInCycle={cycleDay}
            cycleLength={prediction.estimatedCycleLength}
            estimatedPeriodLength={prediction.estimatedPeriodLength}
          />
        </div>
      )}

      {/* Quick check-in: mood and energy are one thought, so they're one card. */}
      <div className="rounded-[var(--radius)] p-4"
        style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
        <SectionLabel className="mb-3">Quick check-in</SectionLabel>
        <MoodSelector value={mood} onChange={setMood} />

        <div className="h-px my-4" style={{ background: 'var(--color-border)' }} />

        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3"
          style={{ color: 'var(--color-foreground-muted)' }}>
          Energy{energy > 0 ? ` · ${ENERGY_LABELS[energy]}` : ''}
        </p>
        <div className="flex gap-2">
          {[1,2,3,4,5].map((lvl) => (
            <button key={lvl}
              onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
              onPointerUp={(e) => e.currentTarget.style.transform = ''}
              onPointerLeave={(e) => e.currentTarget.style.transform = ''}
              onClick={() => setEnergy(energy === lvl ? 0 : lvl)}
              className="flex-1 flex flex-col items-end gap-0.5 px-2 py-2.5 rounded-[var(--radius-sm)]"
              style={{
                background: 'var(--color-surface)',
                boxShadow: energy === lvl ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
                transition: 'transform 0.08s ease, box-shadow 0.1s',
              }}
            >
              {[1,2,3,4,5].map(bar => (
                <div key={bar} className="w-full rounded-sm"
                  style={{
                    height: 3 + bar,
                    background: bar <= lvl && energy >= lvl ? 'var(--color-accent)' : 'var(--color-border)',
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

      {/* Period / Flow — driven by periodStatus */}
      {(periodStatus === 'active-today' || periodStatus === 'active-ongoing') ? (
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
          <FlowSelector value={flow} onChange={setFlow} />
          <div className="flex gap-2 mt-3">
            {/* End period button — always visible when active */}
            <button
              onClick={() => setEndSheetOpen(true)}
              disabled={saving}
              className="flex-1 text-xs py-2 rounded-full font-medium disabled:opacity-50"
              style={{ color: PHASE_META.period.color, background: tint(PHASE_META.period.color, 12), boxShadow: `inset 0 0 0 1px ${tint(PHASE_META.period.color, 30)}` }}
            >
              End period
            </button>
            {/* Undo — removes this period log entirely (mistaken entry) */}
            <button
              onClick={undoPeriod}
              disabled={saving}
              className="flex-1 text-xs py-2 rounded-full disabled:opacity-50"
              style={{ color: 'var(--color-foreground-muted)', background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-border)' }}
            >
              Logged by mistake, undo
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* The one primary action on this screen. */}
          <button
            onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onPointerUp={(e) => e.currentTarget.style.transform = ''}
            onPointerLeave={(e) => e.currentTarget.style.transform = ''}
            onClick={() => setLogSheetOpen(true)}
            className="w-full py-3.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-on-accent)',
              transition: 'transform 0.08s ease',
            }}
          >
            <DropletIcon size={17} />
            {logPeriodLabel}
          </button>
        </div>
      )}

      {/* Symptoms */}
      <div>
        <SectionLabel className="mb-3">Symptoms</SectionLabel>
        <SymptomPicker selected={symptoms} onToggle={toggleSymptom} />
      </div>

      {/* Save — visible as soon as there's anything worth saving */}
      {(mood || energy > 0 || flow !== 'none' || symptoms.length > 0) && (
        <button
          onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
          onPointerUp={(e) => e.currentTarget.style.transform = ''}
          onPointerLeave={(e) => e.currentTarget.style.transform = ''}
          onClick={save}
          disabled={saving}
          className="w-full py-3.5 rounded-full text-sm font-semibold disabled:opacity-60"
          style={{
            background: 'transparent',
            color: 'var(--color-accent)',
            boxShadow: 'inset 0 0 0 1.5px var(--color-accent)',
            transition: 'transform 0.08s ease',
          }}
        >
          {saving ? 'Saving…' : todayLog ? 'Update check-in' : 'Save check-in'}
        </button>
      )}

      {/* A quiet footnote, not a card. It's a nice-to-read, not a thing to do. */}
      {prediction.hasData && (
        <p className="text-[11px] leading-relaxed px-1 pt-1"
          style={{ color: 'var(--color-foreground-muted)' }}>
          {dailyInsight}
        </p>
      )}
    </div>
  );
}
