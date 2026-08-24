import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildReflection } from './reflection';
import { predictCycle, toCycleRecord } from '@/lib/algorithm/prediction';
import { fromISODate, toISODate, subDays } from '@/lib/utils/dates';
import type {
  DecryptedCycle,
  DecryptedDailyLog,
  MoodLevel,
  PredictionResult,
} from '@/types/app';

/**
 * The reflection is generated prose, so what is worth testing is not its
 * wording but its contract: it is deterministic for a given day and state (so
 * it does not flicker on re-open), it moves as the day and the data move, and
 * it never says something the data does not support. The seed folds in
 * Date.now(), so the clock is fixed for the whole suite.
 */
const TODAY = fromISODate('2026-04-05');

vi.useFakeTimers();
vi.setSystemTime(TODAY);
afterEach(() => vi.setSystemTime(TODAY));

let n = 0;
const cycle = (startISO: string, endISO: string | null): DecryptedCycle => ({
  id: `cycle-${(n += 1)}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  payload: { periodStart: startISO, periodEnd: endISO, flowIntensity: 'medium', notes: '' },
});

const log = (
  dateISO: string,
  over: Partial<DecryptedDailyLog['payload']> = {}
): DecryptedDailyLog => ({
  id: `log-${(n += 1)}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  payload: {
    date: dateISO,
    mood: null,
    energy: null,
    symptoms: [],
    notes: '',
    flow: 'none',
    ...over,
  },
});

/** `count` logs ending today, newest first, as the app stores them. */
const recentLogs = (count: number, over: Partial<DecryptedDailyLog['payload']> = {}) =>
  Array.from({ length: count }, (_, i) => log(toISODate(subDays(TODAY, i)), over));

const REGULAR_CYCLES = [
  cycle('2026-01-01', '2026-01-05'),
  cycle('2026-01-29', '2026-02-02'),
  cycle('2026-02-26', '2026-03-02'),
  cycle('2026-03-26', '2026-03-30'),
];

const predictionFor = (cycles: DecryptedCycle[]): PredictionResult =>
  predictCycle(cycles.map((c) => toCycleRecord(c.payload)), TODAY);

describe('buildReflection', () => {
  it('always returns a short paragraph of whole sentences', () => {
    const prediction = predictionFor(REGULAR_CYCLES);
    const { text } = buildReflection(REGULAR_CYCLES, recentLogs(25), prediction);
    expect(text.length).toBeGreaterThan(60);
    expect(text.trim()).toBe(text);
    expect(text.endsWith('.')).toBe(true);
    // One paragraph, not a report: an opener, up to two observations, and a
    // closer, joined with spaces. Some observations are themselves two
    // sentences, so the sentence count runs a little past the four parts.
    expect(text).not.toContain('\n');
    const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(sentences.length).toBeLessThanOrEqual(8);
  });

  it('stays short enough to read in one pass, on the fullest data', () => {
    const prediction = predictionFor(REGULAR_CYCLES);
    for (let day = 0; day < 20; day++) {
      vi.setSystemTime(fromISODate('2026-04-05').getTime() + day * 86_400_000);
      const { text } = buildReflection(
        REGULAR_CYCLES,
        recentLogs(28, { mood: 'low', energy: 1, symptoms: ['cramps', 'headache'] }),
        prediction
      );
      expect(text.length).toBeLessThan(700);
    }
  });

  it('is stable for a given day and state, so re-opening does not reshuffle it', () => {
    const prediction = predictionFor(REGULAR_CYCLES);
    const logs = recentLogs(25);
    const first = buildReflection(REGULAR_CYCLES, logs, prediction).text;
    for (let i = 0; i < 5; i++) {
      expect(buildReflection(REGULAR_CYCLES, logs, prediction).text).toBe(first);
    }
  });

  it('moves on to a fresh reading as the days pass', () => {
    const prediction = predictionFor(REGULAR_CYCLES);
    const logs = recentLogs(25);
    const seen = new Set<string>();
    for (let day = 0; day < 14; day++) {
      vi.setSystemTime(fromISODate('2026-04-05').getTime() + day * 86_400_000);
      seen.add(buildReflection(REGULAR_CYCLES, logs, prediction).text);
    }
    // Not necessarily fourteen different readings, but plainly not one.
    expect(seen.size).toBeGreaterThan(3);
  });

  it('changes when the data changes, on the same day', () => {
    const prediction = predictionFor(REGULAR_CYCLES);
    const sparse = buildReflection(REGULAR_CYCLES, recentLogs(3), prediction).text;
    const full = buildReflection(REGULAR_CYCLES, recentLogs(25), prediction).text;
    expect(sparse).not.toBe(full);
  });

  it('says something warm and true to someone with no history at all', () => {
    // A brand-new user must not be told about a rhythm that does not exist yet.
    const empty = predictCycle([], TODAY);
    const { text } = buildReflection([], [], empty);
    expect(text.length).toBeGreaterThan(40);
    expect(text).not.toMatch(/\d+ days each time|cycle after cycle/);
    expect(text).toMatch(/beginning|starting out/i);
  });

  it('opens on the phase the prediction says you are in', () => {
    const onPeriod = predictCycle(
      [toCycleRecord({ periodStart: '2026-04-04', periodEnd: null })],
      TODAY
    );
    expect(onPeriod.currentPhase).toBe('period');
    const { text } = buildReflection([cycle('2026-04-04', null)], [], onPeriod);
    expect(text).toMatch(/period phase|bleeding/i);
  });

  it('never claims a steady rhythm for cycles that have wandered', () => {
    const erratic = [
      cycle('2026-01-01', '2026-01-05'),
      cycle('2026-01-22', '2026-01-26'), // 21 days
      cycle('2026-03-01', '2026-03-05'), // 38 days
      cycle('2026-03-26', '2026-03-30'), // 25 days
    ];
    const prediction = predictionFor(erratic);
    for (let day = 0; day < 20; day++) {
      vi.setSystemTime(fromISODate('2026-04-05').getTime() + day * 86_400_000);
      const { text } = buildReflection(erratic, recentLogs(25), prediction);
      expect(text).not.toMatch(/remarkably steady|holding beautifully/i);
    }
  });

  it('counts the check-ins it mentions, rather than rounding them', () => {
    const prediction = predictionFor(REGULAR_CYCLES);
    // Logs older than 30 days must not be counted toward the month's rhythm.
    const logs = [...recentLogs(22), log('2025-11-01'), log('2025-12-01')];
    let mentioned: string[] = [];
    for (let day = 0; day < 20; day++) {
      vi.setSystemTime(fromISODate('2026-04-05').getTime() + day * 86_400_000);
      const { text } = buildReflection(REGULAR_CYCLES, logs, prediction);
      mentioned = mentioned.concat([...text.matchAll(/(\d+) (?:of the last 30 days|check-ins)/g)].map((m) => m[1]));
    }
    for (const count of mentioned) expect(Number(count)).toBeLessThanOrEqual(22);
  });

  it('names a recurring symptom only when it has actually recurred', () => {
    const prediction = predictionFor(REGULAR_CYCLES);
    const once = [
      log(toISODate(subDays(TODAY, 1)), { symptoms: ['cramps'] }),
      ...recentLogs(9),
    ];
    for (let day = 0; day < 20; day++) {
      vi.setSystemTime(fromISODate('2026-04-05').getTime() + day * 86_400_000);
      expect(buildReflection(REGULAR_CYCLES, once, prediction).text).not.toMatch(/cramps/i);
    }
  });

  it('surfaces a symptom that keeps coming back', () => {
    const prediction = predictionFor(REGULAR_CYCLES);
    const often = recentLogs(10, { symptoms: ['cramps'] });
    const said = new Set<string>();
    for (let day = 0; day < 25; day++) {
      vi.setSystemTime(fromISODate('2026-04-05').getTime() + day * 86_400_000);
      said.add(buildReflection(REGULAR_CYCLES, often, prediction).text);
    }
    expect([...said].some((t) => /cramps/i.test(t))).toBe(true);
  });

  it('reads a dominant mood only when one really dominates', () => {
    const prediction = predictionFor(REGULAR_CYCLES);
    const moods: MoodLevel[] = ['great', 'good', 'okay', 'low', 'low-energy'];
    const mixed = Array.from({ length: 10 }, (_, i) =>
      log(toISODate(subDays(TODAY, i)), { mood: moods[i % moods.length] })
    );
    for (let day = 0; day < 20; day++) {
      vi.setSystemTime(fromISODate('2026-04-05').getTime() + day * 86_400_000);
      const { text } = buildReflection(REGULAR_CYCLES, mixed, prediction);
      expect(text).not.toMatch(/mostly (bright|steady|even|tender|tired)/i);
    }
  });

  it('keeps its voice: no em dashes, no first person', () => {
    // Both are house rules for this copy, and generated prose is exactly where
    // they slip.
    const prediction = predictionFor(REGULAR_CYCLES);
    for (const logs of [[], recentLogs(3), recentLogs(25, { mood: 'low', energy: 1, symptoms: ['cramps'] })]) {
      for (let day = 0; day < 15; day++) {
        vi.setSystemTime(fromISODate('2026-04-05').getTime() + day * 86_400_000);
        const { text } = buildReflection(REGULAR_CYCLES, logs, prediction);
        expect(text).not.toContain('—');
        expect(text).not.toMatch(/\b(I|we|my|our)\b/);
      }
    }
  });

  it('holds together for every shape of data it can be handed', () => {
    // The reflection is on the Insights page whatever the account looks like,
    // so no combination may throw or come back empty.
    const shapes: [DecryptedCycle[], DecryptedDailyLog[]][] = [
      [[], []],
      [[cycle('2026-03-26', null)], []],
      [REGULAR_CYCLES, []],
      [[], recentLogs(30, { mood: 'great', energy: 5, symptoms: ['headache'] })],
      [REGULAR_CYCLES, recentLogs(1)],
      [REGULAR_CYCLES, recentLogs(30, { mood: 'low', energy: 1 })],
    ];
    for (const [cycles, logs] of shapes) {
      const { text } = buildReflection(cycles, logs, predictionFor(cycles));
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(40);
    }
  });
});
