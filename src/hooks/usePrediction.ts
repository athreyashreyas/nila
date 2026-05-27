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
      toCycleRecord({
        periodStart: c.payload.periodStart,
        periodEnd: c.payload.periodEnd,
      })
    );
    return predictCycle(records, today);
  }, [cycles, today]);
}
