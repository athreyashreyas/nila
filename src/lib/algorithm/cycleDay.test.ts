import { describe, expect, it } from 'vitest';
import {
  cycleDayForDate,
  phaseForCycleDay,
  predictCycle,
  toCycleRecord,
  type CycleRecord,
} from './prediction';
import { addDays, fromISODate, toISODate } from '@/lib/utils/dates';
import type { CyclePhase, PredictionResult } from '@/types/app';

/**
 * The two helpers that answer "which day of the cycle is this date, and what
 * phase is that" for every date on the calendar and in Insights. predictCycle
 * decides only about today; these carry that answer to any other date, so the
 * calendar colouring and the insights engine cannot disagree with each other.
 */
const record = (startISO: string, endISO?: string): CycleRecord => ({
  periodStart: fromISODate(startISO),
  periodEnd: endISO ? fromISODate(endISO) : null,
});

// A textbook 28-day history: periods on the 1st of four consecutive months.
const REGULAR = [
  record('2026-01-01', '2026-01-05'),
  record('2026-01-29', '2026-02-02'),
  record('2026-02-26', '2026-03-02'),
  record('2026-03-26', '2026-03-30'),
];

describe('cycleDayForDate', () => {
  const today = fromISODate('2026-04-05');
  const prediction = predictCycle(REGULAR, today);

  it('says day 1 on the first day of the current period', () => {
    // The last period started on 26 March; 5 April is day 11.
    expect(cycleDayForDate(fromISODate('2026-03-26'), prediction, today)).toBe(1);
    expect(cycleDayForDate(today, prediction, today)).toBe(11);
  });

  it('advances one day per day', () => {
    for (let i = 0; i < 10; i++) {
      const date = addDays(today, i);
      expect(cycleDayForDate(date, prediction, today)).toBe(11 + i);
    }
  });

  it('wraps at the cycle length rather than running past it', () => {
    const length = prediction.estimatedCycleLength;
    const lastDay = addDays(fromISODate('2026-03-26'), length - 1);
    expect(cycleDayForDate(lastDay, prediction, today)).toBe(length);
    // The next day is day 1 of the next cycle, not day 29.
    expect(cycleDayForDate(addDays(lastDay, 1), prediction, today)).toBe(1);
  });

  it('never returns zero or a negative day, however far back the date is', () => {
    // The calendar paints months of history; a modulo that could go negative
    // would leave holes in the colouring.
    for (let i = 1; i <= 120; i++) {
      const day = cycleDayForDate(addDays(today, -i), prediction, today);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(prediction.estimatedCycleLength);
    }
  });

  it('projects forward the same way it reads backwards', () => {
    const length = prediction.estimatedCycleLength;
    for (const offset of [length, 2 * length, 5 * length]) {
      expect(cycleDayForDate(addDays(today, offset), prediction, today)).toBe(
        cycleDayForDate(today, prediction, today)
      );
    }
  });

  it('ignores the time of day on either date', () => {
    const afternoon = new Date(2026, 3, 5, 16, 45);
    const evening = new Date(2026, 3, 5, 23, 30);
    expect(cycleDayForDate(evening, prediction, afternoon)).toBe(
      cycleDayForDate(fromISODate('2026-04-05'), prediction, fromISODate('2026-04-05'))
    );
  });
});

describe('phaseForCycleDay', () => {
  const phaseOn = (day: number) => phaseForCycleDay(day, 28, 5);

  it('runs period, follicular, ovulation, luteal across a 28-day cycle', () => {
    expect(phaseOn(1)).toBe('period');
    expect(phaseOn(5)).toBe('period');
    expect(phaseOn(6)).toBe('follicular');
    expect(phaseOn(11)).toBe('follicular');
    expect(phaseOn(12)).toBe('ovulation'); // ovulation day 14, ±2
    expect(phaseOn(16)).toBe('ovulation');
    expect(phaseOn(17)).toBe('luteal');
    expect(phaseOn(28)).toBe('luteal');
  });

  it('anchors ovulation to the luteal phase, not to the middle of the cycle', () => {
    // The luteal phase is the biological constant, so a longer cycle pushes
    // ovulation later rather than stretching the window.
    expect(phaseForCycleDay(21, 35, 5)).toBe('ovulation'); // 35 - 14 = day 21
    expect(phaseForCycleDay(21, 28, 5)).toBe('luteal'); // 28 - 14 = day 14
    expect(phaseForCycleDay(14, 35, 5)).toBe('follicular');
  });

  it('gives ovulation a five-day window, whatever the cycle length', () => {
    for (const length of [24, 28, 32, 35]) {
      const days = Array.from({ length }, (_, i) => i + 1);
      const ovulating = days.filter((d) => phaseForCycleDay(d, length, 5) === 'ovulation');
      expect(ovulating).toHaveLength(5);
    }
  });

  it('gives the period exactly as many days as the period length', () => {
    for (const periodLength of [3, 5, 7]) {
      const days = Array.from({ length: 28 }, (_, i) => i + 1);
      expect(days.filter((d) => phaseForCycleDay(d, 28, periodLength) === 'period')).toHaveLength(
        periodLength
      );
    }
  });

  it('leaves no day of the cycle without a phase', () => {
    for (const length of [21, 28, 35, 45]) {
      for (let day = 1; day <= length; day++) {
        expect(['period', 'follicular', 'ovulation', 'luteal']).toContain(
          phaseForCycleDay(day, length, 5)
        );
      }
    }
  });

  it('never runs a phase backwards through the cycle', () => {
    // Each phase is one contiguous run; a day of follicular after ovulation
    // would mean the calendar shows the cycle out of order.
    const order: CyclePhase[] = ['period', 'follicular', 'ovulation', 'luteal'];
    let highest = 0;
    for (let day = 1; day <= 28; day++) {
      const index = order.indexOf(phaseForCycleDay(day, 28, 5));
      expect(index).toBeGreaterThanOrEqual(highest);
      highest = index;
    }
  });

  it('does not let a long period swallow the follicular phase silently', () => {
    // A 10-day period on a 24-day cycle leaves ovulation at day 10, so the
    // period claims days the window would otherwise want. Period wins, and the
    // result is still a valid phase on every day.
    for (let day = 1; day <= 24; day++) {
      expect(phaseForCycleDay(day, 24, 10)).toBeTruthy();
    }
    expect(phaseForCycleDay(10, 24, 10)).toBe('period');
  });
});

describe('cycleDayForDate and phaseForCycleDay together', () => {
  it('agree with predictCycle about what phase today is in', () => {
    // These are two routes to the same answer, and the insights engine relies on
    // them meeting: it dates a historical log by walking back from today.
    for (const todayISO of ['2026-03-26', '2026-03-30', '2026-04-02', '2026-04-08', '2026-04-15']) {
      const today = fromISODate(todayISO);
      const prediction: PredictionResult = predictCycle(REGULAR, today);
      const viaHelpers = phaseForCycleDay(
        cycleDayForDate(today, prediction, today),
        prediction.estimatedCycleLength,
        prediction.estimatedPeriodLength
      );
      expect(viaHelpers).toBe(prediction.currentPhase);
    }
  });
});

describe('toCycleRecord', () => {
  it('reads the stored ISO strings as local dates', () => {
    const rec = toCycleRecord({ periodStart: '2026-03-26', periodEnd: '2026-03-30' });
    expect(toISODate(rec.periodStart)).toBe('2026-03-26');
    expect(toISODate(rec.periodEnd!)).toBe('2026-03-30');
  });

  it('keeps an ongoing period open rather than inventing an end', () => {
    const rec = toCycleRecord({ periodStart: '2026-03-26', periodEnd: null });
    expect(rec.periodEnd).toBeNull();
  });

  it('produces a record predictCycle can use directly', () => {
    const today = fromISODate('2026-04-05');
    const fromPayloads = predictCycle(
      [
        toCycleRecord({ periodStart: '2026-02-26', periodEnd: '2026-03-02' }),
        toCycleRecord({ periodStart: '2026-03-26', periodEnd: '2026-03-30' }),
      ],
      today
    );
    expect(fromPayloads.hasData).toBe(true);
    expect(fromPayloads.estimatedCycleLength).toBe(28);
  });
});
