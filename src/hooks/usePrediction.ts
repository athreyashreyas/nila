'use client';

import { useMemo } from 'react';
import { predictCycle, toCycleRecord } from '@/lib/algorithm/prediction';
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
          allRecords = [toCycleRecord({ periodStart: prefs.lastPeriodDate, periodEnd: null })];
        }
      }
    } catch {}

    return predictCycle(allRecords, today, defaultCycleLen, defaultPeriodLen);
  }, [cycles, today]);
}
