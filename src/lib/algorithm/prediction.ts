import type { CyclePhase, ConfidenceLevel, PredictionResult } from '@/types/app';
import { addDays, daysBetween, fromISODate, startOfDay } from '@/lib/utils/dates';

export interface CycleRecord {
  periodStart: Date;
  periodEnd: Date | null;
}

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const LUTEAL_PHASE_DAYS = 14;   // most consistent biological constant

function weightedMean(values: number[]): number {
  if (values.length === 0) return 0;
  // weights: [1, 2, 3, ..., n] — most recent cycle has highest weight
  let weightedSum = 0;
  let totalWeight = 0;
  values.forEach((v, i) => {
    const weight = i + 1;
    weightedSum += v * weight;
    totalWeight += weight;
  });
  return weightedSum / totalWeight;
}

function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 3; // default uncertainty
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function confidenceLevel(cycleCount: number): ConfidenceLevel {
  if (cycleCount >= 4) return 'high';
  if (cycleCount >= 2) return 'medium';
  return 'low';
}

export function predictCycle(
  records: CycleRecord[],
  today: Date = new Date(),
  defaultCycleLen = DEFAULT_CYCLE_LENGTH,
  defaultPeriodLen = DEFAULT_PERIOD_LENGTH,
): PredictionResult {
  const todayNorm = startOfDay(today);

  // Sort chronologically (oldest first, so weighted mean favours recent)
  const sorted = [...records]
    .filter(r => r.periodStart != null)
    .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
    .map(r => ({
      periodStart: startOfDay(r.periodStart),
      periodEnd: r.periodEnd ? startOfDay(r.periodEnd) : null,
    }));

  // ── Cycle lengths: start-to-start of consecutive cycles ──────
  const cycleLengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = daysBetween(sorted[i - 1].periodStart, sorted[i].periodStart);
    if (len >= 18 && len <= 45) cycleLengths.push(len); // sanity filter
  }

  // ── Period lengths: start to end ─────────────────────────────
  const periodLengths: number[] = sorted
    .filter(r => r.periodEnd !== null)
    .map(r => daysBetween(r.periodStart, r.periodEnd!))
    .filter(d => d >= 1 && d <= 10); // sanity filter

  const avgCycleLength = cycleLengths.length > 0
    ? Math.round(weightedMean(cycleLengths))
    : defaultCycleLen;

  const avgPeriodLength = periodLengths.length > 0
    ? Math.round(weightedMean(periodLengths))
    : defaultPeriodLen;

  const cycleStdDev = cycleLengths.length >= 2
    ? stdDev(cycleLengths, weightedMean(cycleLengths))
    : 3;

  const confidenceRange = Math.max(1, Math.min(7, Math.round(cycleStdDev)));
  const confidence = confidenceLevel(sorted.length);

  // ── Derive from most recent cycle ─────────────────────────────
  const lastCycle = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const lastPeriodStart = lastCycle?.periodStart ?? todayNorm;

  const nextPeriodDate = addDays(lastPeriodStart, avgCycleLength);
  const daysUntilNextPeriod = daysBetween(todayNorm, nextPeriodDate);

  // Ovulation: anchor from predicted next period - luteal phase
  const ovulationDay = avgCycleLength - LUTEAL_PHASE_DAYS; // day in cycle (0-indexed from start)
  const ovulationWindowStart = addDays(lastPeriodStart, ovulationDay - 2);
  const ovulationWindowEnd = addDays(lastPeriodStart, ovulationDay + 2);

  // ── Determine current phase ────────────────────────────────────
  const daysFromLastStart = daysBetween(lastPeriodStart, todayNorm);
  const lastCycleIsOpen = lastCycle !== null && lastCycle.periodEnd === null;

  let currentPhase: CyclePhase;
  let dayInPhase: number;

  if (sorted.length === 0) {
    // No cycle history — show a neutral "between periods" state rather than claiming day 1 of period
    currentPhase = 'follicular';
    dayInPhase = 1;
  } else if (daysFromLastStart < 0) {
    // Before first recorded cycle starts (retroactive entry) — treat as luteal
    currentPhase = 'luteal';
    dayInPhase = 1;
  } else if (lastCycleIsOpen) {
    // Period is still active — stay in period phase regardless of estimated length
    currentPhase = 'period';
    dayInPhase = daysFromLastStart + 1;
  } else if (daysFromLastStart < avgPeriodLength) {
    currentPhase = 'period';
    dayInPhase = daysFromLastStart + 1;
  } else if (daysFromLastStart < ovulationDay - 2) {
    currentPhase = 'follicular';
    dayInPhase = daysFromLastStart - avgPeriodLength + 1;
  } else if (daysFromLastStart <= ovulationDay + 2) {
    currentPhase = 'ovulation';
    dayInPhase = daysFromLastStart - (ovulationDay - 2) + 1;
  } else {
    currentPhase = 'luteal';
    dayInPhase = daysFromLastStart - (ovulationDay + 2) + 1;
  }

  return {
    currentPhase,
    dayInPhase: Math.max(1, dayInPhase),
    nextPeriodDate,
    nextPeriodConfidenceRange: confidenceRange,
    ovulationWindowStart,
    ovulationWindowEnd,
    estimatedCycleLength: avgCycleLength,
    estimatedPeriodLength: avgPeriodLength,
    confidence,
    daysUntilNextPeriod,
    hasData: sorted.length > 0,
  };
}

// ── Cycle day (1-indexed) for an arbitrary date ──────────────────
// Walks from today's known cycle day to the target date and normalises into
// [1, cycleLength]. Shared by the calendar colouring and the insights engine so
// the "which day of the cycle is this date" logic lives in exactly one place.
export function cycleDayForDate(
  date: Date,
  prediction: PredictionResult,
  today: Date = new Date(),
): number {
  const { estimatedCycleLength, daysUntilNextPeriod } = prediction;
  const diff = daysBetween(startOfDay(today), startOfDay(date));
  const todayCycleDay = estimatedCycleLength - daysUntilNextPeriod;
  const rawDay = todayCycleDay + diff;
  return ((rawDay - 1) % estimatedCycleLength + estimatedCycleLength) % estimatedCycleLength + 1;
}

// ── Canonical phase-from-cycle-day (1-indexed, day 1 = first day of period) ──
export function phaseForCycleDay(
  dayInCycle: number,
  cycleLength: number,
  periodLength: number,
): CyclePhase {
  const ovDay = cycleLength - LUTEAL_PHASE_DAYS;
  if (dayInCycle <= periodLength) return 'period';
  if (dayInCycle < ovDay - 2) return 'follicular';
  if (dayInCycle <= ovDay + 2) return 'ovulation';
  return 'luteal';
}

// ── Helper: build CycleRecord from decrypted payload strings ─────
export function toCycleRecord(payload: { periodStart: string; periodEnd: string | null }): CycleRecord {
  return {
    periodStart: fromISODate(payload.periodStart),
    periodEnd: payload.periodEnd ? fromISODate(payload.periodEnd) : null,
  };
}
