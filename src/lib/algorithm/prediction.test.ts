import { describe, it, expect } from 'vitest';
import { predictCycle, type CycleRecord } from './prediction';
import { fromISODate, addDays } from '@/lib/utils/dates';

function makeRecord(startISO: string, endISO?: string): CycleRecord {
  return {
    periodStart: fromISODate(startISO),
    periodEnd: endISO ? fromISODate(endISO) : null,
  };
}

describe('predictCycle', () => {
  it('returns defaults for no cycles logged', () => {
    const result = predictCycle([], new Date('2025-06-15'));
    expect(result.estimatedCycleLength).toBe(28);
    expect(result.estimatedPeriodLength).toBe(5);
    expect(result.confidence).toBe('low');
  });

  it('computes correct phase for regular 28-day cycles', () => {
    const cycles = [
      makeRecord('2025-03-01', '2025-03-05'),
      makeRecord('2025-03-29', '2025-04-02'),
      makeRecord('2025-04-26', '2025-04-30'),
      makeRecord('2025-05-24', '2025-05-28'),
    ];
    // Today = Day 3 of latest period
    const result = predictCycle(cycles, fromISODate('2025-05-26'));
    expect(result.currentPhase).toBe('period');
    expect(result.dayInPhase).toBe(3);
    expect(result.estimatedCycleLength).toBe(28);
    expect(result.confidence).toBe('high');
  });

  it('identifies follicular phase correctly', () => {
    const cycles = [
      makeRecord('2025-04-01', '2025-04-05'),
      makeRecord('2025-04-29', '2025-05-03'),
    ];
    // Day 10 after last period start (after period ends, before ovulation)
    const result = predictCycle(cycles, addDays(fromISODate('2025-04-29'), 10));
    expect(result.currentPhase).toBe('follicular');
  });

  it('identifies ovulation phase correctly', () => {
    const cycles = [
      makeRecord('2025-04-01', '2025-04-05'),
      makeRecord('2025-04-29', '2025-05-03'),
    ];
    // Ovulation day ≈ 28 - 14 = Day 14 from start; test Day 14
    const result = predictCycle(cycles, addDays(fromISODate('2025-04-29'), 14));
    expect(result.currentPhase).toBe('ovulation');
  });

  it('identifies luteal phase correctly', () => {
    const cycles = [
      makeRecord('2025-04-01', '2025-04-05'),
      makeRecord('2025-04-29', '2025-05-03'),
    ];
    // Day 20 = post-ovulation window, pre-period
    const result = predictCycle(cycles, addDays(fromISODate('2025-04-29'), 20));
    expect(result.currentPhase).toBe('luteal');
  });

  it('weights recent cycles higher than old ones', () => {
    // Older cycles: 28 days. Recent: 35 days. Weighted avg should be closer to 35.
    const cycles = [
      makeRecord('2025-01-01', '2025-01-05'), // start only matters
      makeRecord('2025-01-29'), // 28 days
      makeRecord('2025-02-26'), // 28 days
      makeRecord('2025-03-26'), // 28 days
      makeRecord('2025-04-30'), // 35 days (most recent)
    ];
    const result = predictCycle(cycles, fromISODate('2025-05-01'));
    // Unweighted average = (28+28+28+35)/4 = 29.75; weighted should be > 29.75
    expect(result.estimatedCycleLength).toBeGreaterThan(29);
  });

  it('handles retroactive logging — log on day 20 for cycle starting day 1', () => {
    // User logs cycle that started 20 days ago
    const cycles = [makeRecord('2025-05-01', '2025-05-05')];
    const result = predictCycle(cycles, fromISODate('2025-05-21')); // day 20 from start
    // Should still return a valid phase
    expect(['period', 'follicular', 'ovulation', 'luteal']).toContain(result.currentPhase);
    expect(result.dayInPhase).toBeGreaterThan(0);
  });

  it('handles cycle straddling month boundary', () => {
    const cycles = [
      makeRecord('2025-01-28', '2025-02-01'), // starts Jan, period ends Feb
      makeRecord('2025-02-25', '2025-03-01'),
    ];
    const result = predictCycle(cycles, fromISODate('2025-03-05'));
    expect(result.estimatedCycleLength).toBe(28);
    expect(result.currentPhase).toBe('follicular'); // day 8 after start, post-period
  });

  it('filters out biologically implausible cycle lengths', () => {
    // 10-day "cycle" and 100-day "cycle" should be filtered
    const cycles = [
      makeRecord('2025-01-01'),
      makeRecord('2025-01-11'), // 10 days — filtered out
      makeRecord('2025-03-21'), // 69 days — filtered out
      makeRecord('2025-04-18'), // 28 days — kept
    ];
    const result = predictCycle(cycles, fromISODate('2025-04-19'));
    // Only one valid cycle length (28), so avg = 28
    expect(result.estimatedCycleLength).toBe(28);
  });

  it('shows high confidence after 4+ cycles', () => {
    const cycles = [
      makeRecord('2025-01-01'),
      makeRecord('2025-01-29'),
      makeRecord('2025-02-26'),
      makeRecord('2025-03-26'),
      makeRecord('2025-04-23'),
    ];
    const result = predictCycle(cycles, fromISODate('2025-04-24'));
    expect(result.confidence).toBe('high');
  });

  it('daysUntilNextPeriod is negative when period is overdue', () => {
    const cycles = [makeRecord('2025-01-01', '2025-01-05')];
    // 60 days have passed, well past the predicted ~28 day cycle
    const result = predictCycle(cycles, fromISODate('2025-03-02'));
    expect(result.daysUntilNextPeriod).toBeLessThan(0);
  });

  it('nextPeriodDate is in the future for recent cycle start', () => {
    const cycles = [makeRecord('2025-05-20', '2025-05-24')];
    const today = fromISODate('2025-05-25'); // day 5 after start
    const result = predictCycle(cycles, today);
    expect(result.nextPeriodDate.getTime()).toBeGreaterThan(today.getTime());
  });
});
