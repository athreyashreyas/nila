'use client';

import { useMemo } from 'react';
import { predictCycle, toCycleRecord } from '@/lib/algorithm/prediction';
import { addDays, fromISODate, toISODate } from '@/lib/utils/dates';
import type { DecryptedCycle, PredictionResult } from '@/types/app';

export function usePrediction(
  cycles: DecryptedCycle[],
  today: Date = new Date()
): PredictionResult {
  return useMemo(() => {
    const records = cycles.map((c) =>
      toCycleRecord({ periodStart: c.payload.periodStart, periodEnd: c.payload.periodEnd })
    );

    let defaultCycleLen = 28;
    let defaultPeriodLen = 5;
    let allRecords = records;

    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('nila-prefs') : null;
      if (raw) {
        const prefs = JSON.parse(raw) as { cycleLength?: number; periodLength?: number; lastPeriodDate?: string | null };
        if (prefs.cycleLength) defaultCycleLen = prefs.cycleLength;
        if (prefs.periodLength) defaultPeriodLen = prefs.periodLength;
        if (records.length === 0 && prefs.lastPeriodDate) {
          // Onboarding seed: lastPeriodDate is a *past* period start, not an active period.
          // Give it an estimated end so the prediction treats it as a closed historical
          // cycle — otherwise periodEnd:null marks it as an ongoing period forever.
          const estimatedEnd = toISODate(addDays(fromISODate(prefs.lastPeriodDate), defaultPeriodLen));
          allRecords = [toCycleRecord({ periodStart: prefs.lastPeriodDate, periodEnd: estimatedEnd })];
        }
      }
    } catch {}

    return predictCycle(allRecords, today, defaultCycleLen, defaultPeriodLen);
  }, [cycles, today]);
}
