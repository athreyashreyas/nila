'use client';

import type { CyclePhase, PredictionResult } from '@/types/app';
import { PHASE_META } from '@/types/app';

interface Props {
  prediction: PredictionResult;
  className?: string;
  /** Outer diameter in px. The stroke and label scale with it. */
  size?: number;
}

export function PhaseRing({ prediction, className = '', size = 120 }: Props) {
  const { currentPhase, dayInPhase, estimatedCycleLength } = prediction;
  const meta = PHASE_META[currentPhase];

  const SIZE = size;
  const STROKE = Math.round(size * 0.067);
  const R = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  // Progress = days elapsed in current cycle / total cycle length
  const cycleDay = getCycleDay(prediction);
  const progress = Math.min(cycleDay / estimatedCycleLength, 1);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  // Dot position at end of arc
  const angle = (progress * 360 - 90) * (Math.PI / 180);
  const dotX = SIZE / 2 + R * Math.cos(angle);
  const dotY = SIZE / 2 + R * Math.sin(angle);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={meta.color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {/* Dot at arc tip */}
        {progress > 0.02 && (
          <circle cx={dotX} cy={dotY} r={STROKE / 2 + 1} fill={meta.color} style={{ transform: 'rotate(90deg)', transformOrigin: `${SIZE / 2}px ${SIZE / 2}px` }} />
        )}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-display leading-none" style={{ color: meta.color, fontSize: Math.round(size * 0.25) }}>{dayInPhase}</span>
        <span className="font-semibold tracking-widest uppercase mt-0.5"
          style={{ color: 'var(--color-foreground-muted)', fontSize: Math.max(8, Math.round(size * 0.078)) }}>day</span>
      </div>
    </div>
  );
}

function getCycleDay(p: PredictionResult): number {
  // Reconstruct how many days into the current cycle we are
  const { currentPhase, dayInPhase, estimatedPeriodLength } = p;
  switch (currentPhase) {
    case 'period':     return dayInPhase;
    case 'follicular': return estimatedPeriodLength + dayInPhase;
    case 'ovulation':  return estimatedPeriodLength + (p.estimatedCycleLength - 14 - 2) + dayInPhase;
    case 'luteal':     return estimatedPeriodLength + (p.estimatedCycleLength - 14 + 2) + dayInPhase;
  }
}
