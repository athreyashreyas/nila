import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDailyInsight } from './engine';
import { PHASE_INSIGHT_TIPS, SYMPTOM_TIPS } from './data';
import { predictCycle, toCycleRecord } from '@/lib/algorithm/prediction';
import { fromISODate, subDays, toISODate } from '@/lib/utils/dates';
import type { CyclePhase, DecryptedDailyLog, PredictionResult } from '@/types/app';

/**
 * The daily insight has two modes: a pattern it has actually observed ("you
 * tend to get cramps in your luteal phase"), and a phase tip when it has not.
 * The pattern claim is the one that has to be earned — telling somebody they
 * "tend to" do something on the strength of one log would be both wrong and
 * unsettling — so most of this is about the bar it has to clear.
 *
 * The phase fallback rotates on Date.now(), so the clock is fixed throughout.
 */
const TODAY = fromISODate('2026-04-05');
vi.useFakeTimers();
vi.setSystemTime(TODAY);
afterEach(() => vi.setSystemTime(TODAY));

let n = 0;
const log = (dateISO: string, symptoms: string[] = []): DecryptedDailyLog => ({
  id: `log-${(n += 1)}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  payload: { date: dateISO, mood: null, energy: null, symptoms, notes: '', flow: 'none' },
});

/** A prediction whose current phase is `phase`, with a plain 28/5 cycle. */
function predictionInPhase(phase: CyclePhase): PredictionResult {
  // Day 1 of the period is the last period start; step back to land in phase.
  const dayInCycle: Record<CyclePhase, number> = {
    period: 1,
    follicular: 8,
    ovulation: 14,
    luteal: 22,
  };
  const start = toISODate(subDays(TODAY, dayInCycle[phase] - 1));
  const prediction = predictCycle(
    [
      toCycleRecord({ periodStart: toISODate(subDays(fromISODate(start), 28)), periodEnd: toISODate(subDays(fromISODate(start), 24)) }),
      toCycleRecord({ periodStart: start, periodEnd: phase === 'period' ? null : toISODate(subDays(fromISODate(start), -4)) }),
    ],
    TODAY
  );
  expect(prediction.currentPhase).toBe(phase);
  return prediction;
}

/** `count` logs, every fourth day back from today, each carrying `symptoms`. */
const historyOf = (count: number, symptoms: string[]) =>
  Array.from({ length: count }, (_, i) => log(toISODate(subDays(TODAY, i * 28)), symptoms));

describe('getDailyInsight', () => {
  it('falls back to a phase tip when there is no history at all', () => {
    for (const phase of ['period', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]) {
      const insight = getDailyInsight(predictionInPhase(phase), [], []);
      expect(PHASE_INSIGHT_TIPS[phase]).toContain(insight);
    }
  });

  it('falls back to a phase tip when nothing was logged today', () => {
    const prediction = predictionInPhase('luteal');
    const insight = getDailyInsight(prediction, [], historyOf(5, ['cramps']));
    expect(PHASE_INSIGHT_TIPS.luteal).toContain(insight);
  });

  it('rotates the phase tip daily rather than repeating one forever', () => {
    const prediction = predictionInPhase('luteal');
    const seen = new Set<string>();
    for (let day = 0; day < PHASE_INSIGHT_TIPS.luteal.length; day++) {
      vi.setSystemTime(TODAY.getTime() + day * 86_400_000);
      seen.add(getDailyInsight(prediction, [], []));
    }
    expect(seen.size).toBe(PHASE_INSIGHT_TIPS.luteal.length);
  });

  it('holds one tip for a whole day, so the card does not flicker on re-open', () => {
    // The rotation buckets on Date.now() / 86_400_000, which is a UTC day, so
    // the tip turns over at UTC midnight rather than local midnight. Stepping
    // through one whole bucket is what actually pins the behaviour; the local
    // offset only decides what time of day the changeover lands on.
    const prediction = predictionInPhase('luteal');
    const bucketStart = Math.floor(TODAY.getTime() / 86_400_000) * 86_400_000;
    vi.setSystemTime(bucketStart);
    const first = getDailyInsight(prediction, [], []);
    for (const hours of [1, 6, 12, 23]) {
      vi.setSystemTime(bucketStart + hours * 3_600_000);
      expect(getDailyInsight(prediction, [], [])).toBe(first);
    }
    vi.setSystemTime(bucketStart + 86_400_000);
    expect(getDailyInsight(prediction, [], [])).not.toBe(first);
  });

  it('claims a pattern once the same symptom has appeared three times in the phase', () => {
    const prediction = predictionInPhase('luteal');
    const insight = getDailyInsight(prediction, ['cramps'], historyOf(3, ['cramps']));
    expect(insight).toContain('You tend to experience cramps');
    expect(insight).toContain('luteal');
    expect(insight).toContain(SYMPTOM_TIPS.cramps);
  });

  it('will not claim a pattern from one or two occurrences', () => {
    // "You tend to" is a claim about somebody's body; two logs do not earn it.
    const prediction = predictionInPhase('luteal');
    for (const count of [1, 2]) {
      const insight = getDailyInsight(prediction, ['cramps'], historyOf(count, ['cramps']));
      expect(insight).not.toContain('You tend to');
      expect(PHASE_INSIGHT_TIPS.luteal).toContain(insight);
    }
  });

  it('counts only logs from the same phase toward the pattern', () => {
    // Cramps in the period phase say nothing about the luteal phase.
    const prediction = predictionInPhase('luteal');
    const otherPhase = [0, 1, 2].map((i) =>
      log(toISODate(subDays(TODAY, 21 + i * 28)), ['cramps'])
    );
    const insight = getDailyInsight(prediction, ['cramps'], otherPhase);
    expect(insight).not.toContain('You tend to');
  });

  it('looks only at the five most recent logs from the phase', () => {
    // Logs are handed over newest first; an old run of cramps should not keep
    // asserting a pattern that has since stopped.
    const prediction = predictionInPhase('luteal');
    const recentClear = [0, 1, 2, 3, 4].map((i) => log(toISODate(subDays(TODAY, i * 28)), []));
    const oldCramps = [5, 6, 7].map((i) => log(toISODate(subDays(TODAY, i * 28)), ['cramps']));
    const insight = getDailyInsight(prediction, ['cramps'], [...recentClear, ...oldCramps]);
    expect(insight).not.toContain('You tend to');
  });

  it('stays quiet about a symptom it has no advice for', () => {
    // A pattern with nothing useful to say about it is worse than a phase tip.
    const prediction = predictionInPhase('luteal');
    const unknown = 'a symptom nobody has heard of';
    const insight = getDailyInsight(prediction, [unknown], historyOf(4, [unknown]));
    expect(insight).not.toContain('You tend to');
    expect(PHASE_INSIGHT_TIPS.luteal).toContain(insight);
  });

  it('reports the first of several patterns rather than stacking them', () => {
    const prediction = predictionInPhase('luteal');
    const insight = getDailyInsight(
      prediction,
      ['bloating', 'cramps'],
      historyOf(4, ['bloating', 'cramps'])
    );
    expect(insight).toContain('bloating');
    expect(insight).not.toContain('cramps');
  });

  it('always returns a non-empty string, whatever it is handed', () => {
    for (const phase of ['period', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]) {
      const prediction = predictionInPhase(phase);
      for (const [symptoms, logs] of [
        [[], []],
        [['cramps'], []],
        [[], historyOf(5, ['cramps'])],
        [['cramps', 'fatigue'], historyOf(5, ['cramps'])],
      ] as [string[], DecryptedDailyLog[]][]) {
        const insight = getDailyInsight(prediction, symptoms, logs);
        expect(typeof insight).toBe('string');
        expect(insight.trim().length).toBeGreaterThan(20);
      }
    }
  });
});

describe('the tip catalogues', () => {
  it('gives every phase a rotation with more than one tip in it', () => {
    for (const phase of ['period', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]) {
      expect(PHASE_INSIGHT_TIPS[phase].length).toBeGreaterThan(1);
      expect(new Set(PHASE_INSIGHT_TIPS[phase]).size).toBe(PHASE_INSIGHT_TIPS[phase].length);
    }
  });

  it('writes every tip as a whole sentence', () => {
    const all = [...Object.values(PHASE_INSIGHT_TIPS).flat(), ...Object.values(SYMPTOM_TIPS)];
    for (const tip of all) {
      expect(tip.trim()).toBe(tip);
      expect(tip.endsWith('.')).toBe(true);
      expect(tip.length).toBeGreaterThan(20);
    }
  });

  it('keeps the em dash out of both catalogues', () => {
    const all = [...Object.values(PHASE_INSIGHT_TIPS).flat(), ...Object.values(SYMPTOM_TIPS)];
    for (const tip of all) expect(tip).not.toContain('—');
  });

  it('keys the symptom tips by the lower-case names the logs actually carry', () => {
    for (const key of Object.keys(SYMPTOM_TIPS)) {
      expect(key).toBe(key.toLowerCase());
      expect(key.trim()).toBe(key);
    }
  });
});
