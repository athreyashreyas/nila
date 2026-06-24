'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/lib/theme/context';
import { useAppData } from '@/lib/data/context';
import { PhaseRing } from '@/components/ui/PhaseRing';
import { Toast, useToast } from '@/components/ui/Toast';
import { SmartLogSheet } from '@/components/ui/SmartLogSheet';
import { EndPeriodSheet } from '@/components/ui/EndPeriodSheet';
import { PHASE_META, SYMPTOMS, MOODS, FLOWS } from '@/types/app';
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

const PHASE_EMOJI: Record<CyclePhase, string> = {
  period: '🌸', follicular: '✨', ovulation: '🌷', luteal: '🌙',
};

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

// ─── Home page ─────────────────────────────────────────────────

export default function HomePage() {
  const TODAY = toISODate(new Date());
  const { theme, setTheme } = useTheme();
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
  const phaseEmoji = PHASE_EMOJI[prediction.currentPhase];

  // Pick a line for the current phase, stable within a phase but re-picked when the
  // phase changes. The previous useRef locked it to whatever phase was current on the
  // very first render (usually the pre-data-load default), so it could mismatch.
  const greetLine = useMemo(() => {
    const pool = PHASE_LINES[prediction.currentPhase];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [prediction.currentPhase]);

  const greetingName = userName
    ? `${timePrefix}, ${userName} ${phaseEmoji}`
    : `${timePrefix} ${phaseEmoji}`;

  const daysLabel = prediction.daysUntilNextPeriod > 1
    ? `${prediction.daysUntilNextPeriod} days away`
    : prediction.daysUntilNextPeriod === 1 ? 'tomorrow'
    : prediction.daysUntilNextPeriod === 0 ? 'today'
    : `${Math.abs(prediction.daysUntilNextPeriod)} days late`;

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
    if (periodStatus === 'approaching') {
      return `🩸 Period due soon, log it`;
    }
    if (periodStatus === 'late') {
      const days = Math.abs(prediction.daysUntilNextPeriod);
      return `🩸 Period overdue by ${days} day${days === 1 ? '' : 's'}, log it`;
    }
    return `🩸 Log period`;
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

      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight leading-tight">
            {greetingName}
          </h1>
          <p className="font-display text-sm italic mt-0.5 leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>
            {greetLine}
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

      {/* Phase card + hormone graph */}
      <div className="rounded-[var(--radius)] p-5"
        style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
        {prediction.hasData ? (
          <>
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
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
              Hormone activity, drag to explore
            </p>
            <HormoneGraph
              dayInCycle={cycleDay}
              cycleLength={prediction.estimatedCycleLength}
              estimatedPeriodLength={prediction.estimatedPeriodLength}
            />
          </>
        ) : (
          <div className="flex flex-col items-center py-4 gap-2 text-center">
            <span className="text-3xl">🌸</span>
            <p className="text-sm font-semibold">Log your first period to get started</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
              Nila will learn your cycle and show personalised insights here.
            </p>
          </div>
        )}
      </div>

      {/* Phase focus + daily insight — only meaningful once there's data */}
      {prediction.hasData && (
        <>
          <div className="rounded-[var(--radius-sm)] px-4 py-3"
            style={{ background: `${meta.color}12`, boxShadow: `inset 0 0 0 1px ${meta.color}30` }}>
            <p className="text-xs font-semibold mb-1" style={{ color: meta.color }}>Today's focus</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
              {pickDaily(PHASE_FOCUS[prediction.currentPhase])}
            </p>
          </div>

          <div className="rounded-[var(--radius-sm)] px-4 py-3 flex gap-3 items-start"
            style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
            <span className="text-base mt-0.5 flex-shrink-0">💡</span>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
              {dailyInsight}
            </p>
          </div>
        </>
      )}

      {/* Mood */}
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3"
          style={{ color: 'var(--color-foreground-muted)' }}>
          How are you feeling?
        </p>
        <div className="flex gap-2">
          {MOODS.map(({ value, emoji, label }) => (
            <button key={value}
              onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onPointerUp={(e) => e.currentTarget.style.transform = ''}
              onPointerLeave={(e) => e.currentTarget.style.transform = ''}
              onClick={() => setMood(value)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[var(--radius-sm)] text-xl"
              style={{
                background: 'var(--color-surface)',
                boxShadow: mood === value ? 'inset 0 0 0 2px var(--color-accent)' : 'none',
                opacity: mood && mood !== value ? 0.45 : 1,
                transition: 'transform 0.08s ease, box-shadow 0.1s, opacity 0.1s',
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
          Energy level{energy > 0 ? ` · ${ENERGY_LABELS[energy]}` : ''}
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
          <div className="flex gap-1.5">
            {FLOWS.map(({ value, label }) => (
              <button key={value}
                onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                onPointerUp={(e) => e.currentTarget.style.transform = ''}
                onPointerLeave={(e) => e.currentTarget.style.transform = ''}
                onClick={() => setFlow(value)}
                className="flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-medium"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: flow === value ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
                  opacity: flow !== value ? 0.55 : 1,
                  color: flow === value ? 'var(--color-accent)' : undefined,
                  transition: 'transform 0.08s ease, box-shadow 0.1s, opacity 0.1s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            {/* End period button — always visible when active */}
            <button
              onClick={() => setEndSheetOpen(true)}
              disabled={saving}
              className="flex-1 text-xs py-2 rounded-full font-medium disabled:opacity-50"
              style={{ color: PHASE_META.period.color, background: `${PHASE_META.period.color}12`, boxShadow: `inset 0 0 0 1px ${PHASE_META.period.color}30` }}
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
          <button
            onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onPointerUp={(e) => e.currentTarget.style.transform = ''}
            onPointerLeave={(e) => e.currentTarget.style.transform = ''}
            onClick={() => setLogSheetOpen(true)}
            className="w-full py-3.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: periodStatus === 'late' ? `${PHASE_META.period.color}15` : 'var(--color-surface)',
              boxShadow: `inset 0 0 0 1.5px ${periodStatus === 'late' ? PHASE_META.period.color : 'var(--color-border)'}`,
              color: periodStatus === 'late' ? PHASE_META.period.color : undefined,
              transition: 'transform 0.08s ease',
            }}
          >
            {logPeriodLabel}
          </button>
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
            <button key={s}
              onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.93)'}
              onPointerUp={(e) => e.currentTarget.style.transform = ''}
              onPointerLeave={(e) => e.currentTarget.style.transform = ''}
              onClick={() => toggleSymptom(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: symptoms.includes(s) ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                boxShadow: symptoms.includes(s) ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
                color: symptoms.includes(s) ? 'var(--color-accent)' : undefined,
                opacity: !symptoms.includes(s) ? 0.6 : 1,
                transition: 'transform 0.08s ease, box-shadow 0.1s, opacity 0.1s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
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
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)', transition: 'transform 0.08s ease' }}
        >
          {saving ? 'Saving…' : todayLog ? 'Update check-in' : 'Save check-in'}
        </button>
      )}
    </div>
  );
}
