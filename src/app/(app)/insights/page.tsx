'use client';

import { useAppData } from '@/lib/data/context';
import { PHASE_META } from '@/types/app';
import { daysBetween, fromISODate, toISODate } from '@/lib/utils/dates';
import { getRecommendations } from '@/lib/recommendations/data';

const CHART_H = 120;
const CHART_W = 300;

export default function InsightsPage() {
  const { cycles, logs, prediction } = useAppData();

  const todayISO = toISODate(new Date());
  const todayLog = logs.find(l => l.payload.date === todayISO);
  const recentSymptoms = todayLog?.payload.symptoms ?? [];

  const recs = getRecommendations(prediction.currentPhase, recentSymptoms);

  const sorted = [...cycles].sort((a, b) => a.payload.periodStart.localeCompare(b.payload.periodStart));
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = daysBetween(fromISODate(sorted[i - 1].payload.periodStart), fromISODate(sorted[i].payload.periodStart));
    if (len >= 18 && len <= 45) lengths.push(len);
  }

  const minLen = lengths.length > 0 ? Math.min(...lengths) : 24;
  const maxLen = lengths.length > 0 ? Math.max(...lengths) : 32;
  const range = Math.max(maxLen - minLen, 4);

  let path = '';
  let area = '';
  if (lengths.length >= 2) {
    const pts = lengths.map((l, i) => ({
      x: (i / (lengths.length - 1)) * CHART_W,
      y: CHART_H - ((l - minLen) / range) * CHART_H,
    }));
    path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    area = `${path} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  }

  const avg = prediction.estimatedCycleLength;
  const avgPeriod = prediction.estimatedPeriodLength;
  const meta = PHASE_META[prediction.currentPhase];

  return (
    <div className="px-5 pt-4 pb-28">
      <h1 className="text-2xl font-bold pt-2 mb-5">Insights</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Avg cycle', value: `${avg}d`, sub: prediction.confidence + ' confidence' },
          { label: 'Avg period', value: `${avgPeriod}d`, sub: `${cycles.length} cycles logged` },
          { label: 'Next in', value: prediction.daysUntilNextPeriod > 0 ? `${prediction.daysUntilNextPeriod}d` : 'overdue', sub: `±${prediction.nextPeriodConfidenceRange}d` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-[var(--radius)] p-3 text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>{value}</div>
            <div className="text-[10px] font-semibold mt-0.5">{label}</div>
            <div className="text-[9px] mt-0.5 opacity-50">{sub}</div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="rounded-[var(--radius)] p-4 mb-5"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-foreground-muted)' }}>
            {recs.headline}
          </h2>
          <span className="text-xs font-semibold ml-2 px-2 py-0.5 rounded-full"
            style={{ background: `${meta.color}22`, color: meta.color }}>
            {meta.label}
          </span>
        </div>

        <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
          {recs.bodyNote}
        </p>

        {recs.symptomTriggers.length > 0 && (
          <p className="text-[10px] mb-3 font-medium" style={{ color: meta.color }}>
            Personalised for: {recs.symptomTriggers.join(', ')}
          </p>
        )}

        <div className="flex flex-col gap-2.5 mb-4">
          {recs.foods.map((food, i) => (
            <div key={food.name} className="flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">{food.emoji}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{food.name}</span>
                  {i === 0 && recs.symptomTriggers.length > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${meta.color}20`, color: meta.color }}>
                      top pick
                    </span>
                  )}
                </div>
                <p className="text-xs leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>{food.reason}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[var(--radius-sm)] p-3 mb-3"
          style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground)' }}>{recs.lifestyle}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--color-foreground-muted)' }}>
            Go easy on
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recs.avoid.map(item => (
              <span key={item} className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', opacity: 0.7 }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Cycle chart */}
      <div className="rounded-[var(--radius)] p-4 mb-5"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: 'var(--color-foreground-muted)' }}>
          Cycle lengths
        </h2>
        {lengths.length < 2 ? (
          <div className="text-sm opacity-40 text-center py-8">Log 2+ cycles to see your chart.</div>
        ) : (
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ height: CHART_H }}>
            <path d={area} fill="var(--color-accent)" fillOpacity={0.1} />
            <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {lengths.map((l, i) => {
              const x = (i / (lengths.length - 1)) * CHART_W;
              const y = CHART_H - ((l - minLen) / range) * CHART_H;
              return <circle key={i} cx={x} cy={y} r={3} fill="var(--color-accent)" />;
            })}
          </svg>
        )}
        {lengths.length >= 2 && (
          <div className="flex justify-between mt-2">
            <span className="text-[10px] opacity-40">Oldest</span>
            <span className="text-[10px] opacity-40">Most recent</span>
          </div>
        )}
      </div>

      {/* Phase breakdown */}
      <div className="rounded-[var(--radius)] p-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: 'var(--color-foreground-muted)' }}>
          Current cycle
        </h2>
        {(['period', 'follicular', 'ovulation', 'luteal'] as const).map((phase) => {
          const pMeta = PHASE_META[phase];
          const durations = { period: avgPeriod, follicular: avg - 14 - avgPeriod - 4, ovulation: 5, luteal: 14 };
          const pct = (durations[phase] / avg) * 100;
          const isCurrent = prediction.currentPhase === phase;
          return (
            <div key={phase} className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pMeta.color }} />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className={isCurrent ? 'font-bold' : ''}>{pMeta.label}</span>
                  <span className="opacity-50">{durations[phase]}d</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pMeta.color, opacity: isCurrent ? 1 : 0.35 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
