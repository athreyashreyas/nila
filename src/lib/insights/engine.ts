import type { CyclePhase, PredictionResult, DecryptedDailyLog } from '@/types/app';
import { PHASE_META } from '@/types/app';
import { phaseForCycleDay } from '@/lib/algorithm/prediction';
import { fromISODate, daysBetween, startOfDay } from '@/lib/utils/dates';
import { SYMPTOM_TIPS, PHASE_INSIGHT_TIPS } from '@/lib/insights/data';

// Derive the cycle phase for a historical log date using the current prediction as anchor.
// Uses the same approach as the calendar phase colouring: walk back from today's known cycle day.
function logPhase(
  logDate: string,
  prediction: PredictionResult,
  today: Date,
): CyclePhase | null {
  const { estimatedCycleLength, estimatedPeriodLength, daysUntilNextPeriod } = prediction;
  const diff = daysBetween(startOfDay(today), startOfDay(fromISODate(logDate)));
  // Cycle day today (1-indexed). daysUntilNextPeriod < 0 means overdue.
  const todayCycleDay = estimatedCycleLength - daysUntilNextPeriod;
  const rawDay = todayCycleDay + diff;
  // Normalise to [1, cycleLength]
  const dayInCycle =
    ((rawDay - 1) % estimatedCycleLength + estimatedCycleLength) % estimatedCycleLength + 1;
  return phaseForCycleDay(dayInCycle, estimatedCycleLength, estimatedPeriodLength);
}

export function getDailyInsight(
  prediction: PredictionResult,
  todaySymptoms: string[],
  logs: DecryptedDailyLog[],
): string {
  const { currentPhase } = prediction;
  const today = new Date();

  // Pattern detection: any symptom logged today that appeared in ≥3 of the last 5
  // logs from the same cycle phase.
  if (todaySymptoms.length > 0 && logs.length > 0) {
    const samePhaseLogs = logs
      .filter(l => logPhase(l.payload.date, prediction, today) === currentPhase)
      .slice(0, 5); // most recent 5 (logs already sorted descending)

    for (const symptom of todaySymptoms) {
      const matchCount = samePhaseLogs.filter(l =>
        l.payload.symptoms.includes(symptom)
      ).length;
      if (matchCount >= 3 && SYMPTOM_TIPS[symptom]) {
        const phaseLabel = PHASE_META[currentPhase].label.toLowerCase();
        return `You tend to experience ${symptom} in your ${phaseLabel} phase. ${SYMPTOM_TIPS[symptom]}`;
      }
    }
  }

  // Phase fallback: rotate daily so the tip doesn't feel stale
  const tips = PHASE_INSIGHT_TIPS[currentPhase];
  return tips[Math.floor(Date.now() / 86400000) % tips.length];
}
