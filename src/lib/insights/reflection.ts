import type { DecryptedCycle, DecryptedDailyLog, PredictionResult, MoodLevel } from '@/types/app';
import { PHASE_META } from '@/types/app';
import { daysBetween, fromISODate, toISODate } from '@/lib/utils/dates';

// The warm, human voice of Insights. It reads like a perceptive friend giving an
// honest, specific read of how the last little while has gone, plus real
// encouragement. Never first person, never eggshell-hedged, never an em dash.
//
// Two things keep it from feeling canned over weeks and months:
//   1. It rotates WHICH truths it surfaces. On any given day several
//      observations apply (regularity, logging rhythm, mood, a recurring
//      symptom, energy, the phase you're in); a seed features a fresh couple.
//   2. It rotates HOW each is said, from sizeable phrasing pools.
// The seed is derived from the day plus your actual numbers, so a reflection is
// stable for a given day and state (no flicker on re-open) yet moves as the days
// and your data do.

// ─── seeded, deterministic pseudo-randomness ──────────────────
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── observation building ─────────────────────────────────────
interface Observation {
  key: string;
  weight: number; // higher = more worth featuring
  say: (pick: <T>(pool: T[]) => T) => string;
}

function standardDeviation(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function cycleLengths(cycles: DecryptedCycle[]): number[] {
  const sorted = [...cycles].sort((a, b) => a.payload.periodStart.localeCompare(b.payload.periodStart));
  const out: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = daysBetween(fromISODate(sorted[i - 1].payload.periodStart), fromISODate(sorted[i].payload.periodStart));
    if (len >= 18 && len <= 45) out.push(len);
  }
  return out;
}

const MOOD_WORD: Record<MoodLevel, string> = {
  great: 'bright',
  good: 'steady',
  okay: 'even',
  low: 'tender',
  'low-energy': 'tired',
};

function buildObservations(
  cycles: DecryptedCycle[],
  logs: DecryptedDailyLog[],
  prediction: PredictionResult,
): Observation[] {
  const obs: Observation[] = [];
  const today = new Date();

  // Regularity, from cycle-to-cycle length.
  const lengths = cycleLengths(cycles);
  if (lengths.length >= 2) {
    const sd = standardDeviation(lengths);
    const avg = prediction.estimatedCycleLength;
    if (sd <= 2) {
      obs.push({
        key: 'regular',
        weight: 5,
        say: (pick) =>
          pick([
            `Your cycles have been remarkably steady, close to ${avg} days each time.`,
            `Your rhythm is holding beautifully, around ${avg} days cycle after cycle.`,
            `There is a real regularity to you lately, roughly ${avg} days between periods.`,
          ]),
      });
    } else if (sd <= 4) {
      obs.push({
        key: 'mostly-regular',
        weight: 4,
        say: (pick) =>
          pick([
            `Your cycles keep a loose, natural rhythm around ${avg} days, give or take.`,
            `There is a gentle pattern to you, near ${avg} days, with the small variations that are just being human.`,
          ]),
      });
    } else {
      obs.push({
        key: 'variable',
        weight: 4,
        say: (pick) =>
          pick([
            `Your cycles have wandered a little lately, which happens for all sorts of ordinary reasons.`,
            `Your rhythm has been less predictable recently. Bodies do this, and it rarely means anything is wrong.`,
          ]),
      });
    }
  }

  // Logging rhythm over the last 30 days.
  const cutoff = toISODate(new Date(today.getTime() - 30 * 86400000));
  const recentLogs = logs.filter((l) => l.payload.date >= cutoff);
  const logged = recentLogs.length;
  if (logged >= 20) {
    obs.push({
      key: 'consistent',
      weight: 4,
      say: (pick) =>
        pick([
          `You have checked in on ${logged} of the last 30 days. That kind of steady attention is how you come to know yourself.`,
          `Thirty days, ${logged} check-ins. You are really showing up for yourself.`,
        ]),
    });
  } else if (logged >= 8) {
    obs.push({
      key: 'some-logging',
      weight: 2,
      say: (pick) =>
        pick([
          `You have noted ${logged} days this past month. Every one of them adds to a truer picture.`,
          `A handful of check-ins this month, ${logged} in all. It is enough to start seeing yourself clearly.`,
        ]),
    });
  }

  // Dominant mood in the last ~14 logs.
  const moodLogs = logs.filter((l) => l.payload.mood).slice(0, 14);
  if (moodLogs.length >= 4) {
    const counts = new Map<MoodLevel, number>();
    for (const l of moodLogs) {
      const m = l.payload.mood as MoodLevel;
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    const [topMood, topN] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topN >= Math.ceil(moodLogs.length / 2)) {
      const word = MOOD_WORD[topMood];
      obs.push({
        key: 'mood',
        weight: 3,
        say: (pick) =>
          pick([
            `Your days have felt mostly ${word} of late.`,
            `Lately the thread running through your days is a ${word} one.`,
            `Most days recently have landed on the ${word} side.`,
          ]),
      });
    }
  }

  // A recurring symptom, and the phase it tends to cluster in.
  const symptomLogs = logs.slice(0, 30);
  if (symptomLogs.length >= 6) {
    const counts = new Map<string, number>();
    for (const l of symptomLogs) for (const s of l.payload.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length > 0 && ranked[0][1] >= 3) {
      const [sym, n] = ranked[0];
      obs.push({
        key: 'symptom',
        weight: 3,
        say: (pick) =>
          pick([
            `${cap(sym)} has come up ${n} times recently, so it is worth being gentle with yourself when it arrives.`,
            `You have noted ${sym} ${n} times of late. Knowing it is coming is half of meeting it kindly.`,
          ]),
      });
    }
  }

  // Energy read.
  const energyLogs = logs.filter((l) => l.payload.energy != null).slice(0, 14);
  if (energyLogs.length >= 5) {
    const avgE = energyLogs.reduce((a, l) => a + (l.payload.energy as number), 0) / energyLogs.length;
    if (avgE >= 3.6) {
      obs.push({
        key: 'energy-high',
        weight: 2,
        say: (pick) => pick([`Your energy has been running high, so lean into what you feel like beginning.`, `There is fuel in the tank lately. A good stretch for the things you have been putting off.`]),
      });
    } else if (avgE <= 2.3) {
      obs.push({
        key: 'energy-low',
        weight: 2,
        say: (pick) => pick([`Your energy has been low, which is a fair reason to ask less of yourself for a while.`, `You have been running quieter lately. Rest is not falling behind.`]),
      });
    }
  }

  return obs;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// The phase-aware opener, always present, so a brand-new user with no history
// still gets something warm and true.
function opener(prediction: PredictionResult, pick: <T>(pool: T[]) => T): string {
  if (!prediction.hasData) {
    return pick([
      'This is the beginning of your record. A few check-ins from here and your rhythm will start to show.',
      'You are just starting out. Log a period or two and this page will fill with your own patterns.',
    ]);
  }
  const phase = prediction.currentPhase;
  const label = PHASE_META[phase].label.toLowerCase();
  const byPhase: Record<string, string[]> = {
    period: [
      `You are in your ${label} phase, a time to soften the pace and rest where you can.`,
      `Right now you are bleeding, and your body is doing quiet, real work. Be gentle.`,
    ],
    follicular: [
      `You are in your ${label} phase, with energy quietly building back up.`,
      `This is your ${label} stretch, a natural time to begin things.`,
    ],
    ovulation: [
      `You are around ovulation, often the brightest, most outward part of the month.`,
      `You are near your peak this week. Soak up the clarity while it is here.`,
    ],
    luteal: [
      `You are in your ${label} phase, when it is normal to want to turn inward.`,
      `This is your ${label} stretch, a good time to ease off and tend to yourself.`,
    ],
  };
  return pick(byPhase[phase]);
}

// The warm closer, framed around showing up, never around a streak to break.
function closer(pick: <T>(pool: T[]) => T): string {
  return pick([
    'However this month has gone, you are paying attention to yourself, and that is the whole thing.',
    'There is nothing to get right here. Just you, learning your own rhythm, gently.',
    'Whatever the numbers say, being here, noticing, is its own kind of care.',
    'You are doing this with tenderness, and that matters more than any pattern.',
  ]);
}

export interface Reflection {
  // A short paragraph, 2 to 4 sentences, that reads as one warm thought.
  text: string;
}

export function buildReflection(
  cycles: DecryptedCycle[],
  logs: DecryptedDailyLog[],
  prediction: PredictionResult,
): Reflection {
  // Seed: the day plus the shape of the data. Stable within a day and state,
  // fresh as either moves.
  const dayBucket = Math.floor(Date.now() / 86400000);
  const seed = hashStr(`${dayBucket}:${cycles.length}:${logs.length}:${prediction.currentPhase}:${prediction.estimatedCycleLength}`);
  const rand = mulberry32(seed);
  const pick = <T,>(pool: T[]): T => pool[Math.floor(rand() * pool.length)];

  const parts: string[] = [opener(prediction, pick)];

  // Feature up to two of the applicable observations, chosen by a weighted,
  // seeded shuffle so different days surface different truths.
  const obs = buildObservations(cycles, logs, prediction);
  const shuffled = obs
    .map((o) => ({ o, r: rand() * o.weight }))
    .sort((a, b) => b.r - a.r)
    .map((x) => x.o);
  for (const o of shuffled.slice(0, 2)) parts.push(o.say(pick));

  parts.push(closer(pick));

  return { text: parts.join(' ') };
}
