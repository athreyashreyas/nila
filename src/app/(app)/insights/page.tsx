'use client';

import { useState } from 'react';
import { useAppData } from '@/lib/data/context';
import { PHASE_META, tint } from '@/types/app';
import { LeafIcon } from '@/components/ui/icons';
import { daysBetween, fromISODate, toISODate } from '@/lib/utils/dates';
import { getRecommendations } from '@/lib/recommendations/data';
import { buildReflection } from '@/lib/insights/reflection';
import { Bars, Heatmap } from '@/components/charts';

const CHART_H = 120;
const CHART_W = 300;

function readIsVeg(): boolean {
  try { return JSON.parse(localStorage.getItem('nila-prefs') ?? '{}').diet === 'veg'; }
  catch { return false; }
}

function saveIsVeg(v: boolean) {
  try {
    const prefs = JSON.parse(localStorage.getItem('nila-prefs') ?? '{}');
    localStorage.setItem('nila-prefs', JSON.stringify({ ...prefs, diet: v ? 'veg' : 'all' }));
  } catch {}
}

export default function InsightsPage() {
  const { cycles, logs, prediction } = useAppData();
  const [isVeg, setIsVeg] = useState(readIsVeg);

  function toggleVeg() {
    const next = !isVeg;
    setIsVeg(next);
    saveIsVeg(next);
  }

  const todayISO = toISODate(new Date());
  const todayLog = logs.find(l => l.payload.date === todayISO);
  const recentSymptoms = todayLog?.payload.symptoms ?? [];

  const recs = getRecommendations(prediction.currentPhase, recentSymptoms, isVeg);

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

  const reflection = buildReflection(cycles, logs, prediction);

  // Recent symptom frequency (last 60 days), top 6.
  const symptomCutoff = toISODate(new Date(Date.now() - 60 * 86400000));
  const symptomCounts = new Map<string, number>();
  for (const l of logs) {
    if (l.payload.date < symptomCutoff) continue;
    for (const s of l.payload.symptoms) symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1);
  }
  const symptomBars = [...symptomCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Check-in rhythm: one filled cell per day a log exists.
  const checkinDays = new Map<string, number>();
  for (const l of logs) checkinDays.set(l.payload.date, 1);

  return (
    <div className="px-5 pt-4 pb-28">
      {/* pr-10 leaves the top-right corner clear for the sync dot. */}
      <h1 className="font-display text-[26px] pt-1 mb-4 pr-10">Your rhythm</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Avg cycle', value: `${avg}d`, sub: prediction.confidence + ' confidence' },
          { label: 'Avg period', value: `${avgPeriod}d`, sub: `${cycles.length} cycles logged` },
          { label: 'Next in', value: prediction.daysUntilNextPeriod > 0 ? `${prediction.daysUntilNextPeriod}d` : 'overdue', sub: `±${prediction.nextPeriodConfidenceRange}d` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-[var(--radius)] p-3 text-center"
            style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
            <div className="font-display text-[26px] leading-none" style={{ color: 'var(--color-accent)' }}>{value}</div>
            <div className="text-[10px] font-semibold mt-1.5">{label}</div>
            <div className="text-[9px] mt-0.5 opacity-50">{sub}</div>
          </div>
        ))}
      </div>

      {/* A warm, human read on how the last little while has gone. Rotates which
          truths it surfaces and how it says them, so it stays fresh over months.
          Set as an editorial serif line: it's the page's opening thought. */}
      <div className="rounded-[var(--radius)] p-5 mb-5"
        style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-[10px] font-bold mb-2.5 tracking-widest uppercase" style={{ color: 'var(--color-accent)' }}>
          A note on your rhythm
        </h2>
        <p className="font-display text-[18px] leading-snug" style={{ color: 'var(--color-foreground)' }}>
          {reflection.text}
        </p>
      </div>

      {/* Recommendations */}
      <div className="rounded-[var(--radius)] p-4 mb-5"
        style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-start gap-2 flex-1">
            <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-foreground-muted)' }}>
              {recs.headline}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: tint(meta.color, 15), color: meta.color }}>
              {meta.label}
            </span>
          </div>
          {/* Veg toggle */}
          <button
            onClick={toggleVeg}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0 ml-2"
            style={{
              background: isVeg ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              color: isVeg ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
              boxShadow: isVeg ? 'inset 0 0 0 1px var(--color-accent)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <LeafIcon size={13} />
            {isVeg ? 'Veg on' : 'Veg'}
          </button>
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
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{food.name}</span>
                  {i === 0 && recs.symptomTriggers.length > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: tint(meta.color, 14), color: meta.color }}>
                      top pick
                    </span>
                  )}
                  {food.veg && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full" aria-label="Vegetarian"
                      style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                      <LeafIcon size={11} />
                    </span>
                  )}
                </div>
                <p className="text-xs leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>{food.reason}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[var(--radius-sm)] p-3 mb-3"
          style={{ background: tint(meta.color, 10), boxShadow: `inset 0 0 0 1px ${tint(meta.color, 25)}` }}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground)' }}>{recs.lifestyle}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--color-foreground-muted)' }}>
            Go easy on
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recs.avoid.map(item => (
              <span key={item} className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-border)', opacity: 0.7 }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Check-in rhythm */}
      <div className="rounded-[var(--radius)] p-4 mb-5"
        style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: 'var(--color-foreground-muted)' }}>
          Check-in rhythm
        </h2>
        {logs.length === 0 ? (
          <div className="text-sm opacity-40 text-center py-6">Your check-ins will show here as you log.</div>
        ) : (
          <>
            <Heatmap days={checkinDays} weeks={12} />
            <p className="text-[10px] mt-2 opacity-40">Last 12 weeks. Every square is a day you showed up.</p>
          </>
        )}
      </div>

      {/* Recent symptoms */}
      {symptomBars.length > 0 && (
        <div className="rounded-[var(--radius)] p-4 mb-5"
          style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: 'var(--color-foreground-muted)' }}>
            Recent symptoms
          </h2>
          <Bars data={symptomBars} />
          <p className="text-[10px] mt-3 opacity-40">Most noted over the last 60 days.</p>
        </div>
      )}

      {/* Cycle chart */}
      <div className="rounded-[var(--radius)] p-4 mb-5"
        style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
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
        style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: 'var(--color-foreground-muted)' }}>
          Current cycle
        </h2>
        {(['period', 'follicular', 'ovulation', 'luteal'] as const).map((phase) => {
          const pMeta = PHASE_META[phase];
          // Follicular fills whatever's left after period (avgPeriod), ovulation (5) and luteal (14).
          // Clamp at 0 so short-cycle / long-period combos never produce negative widths.
          const durations = {
            period: avgPeriod,
            follicular: Math.max(0, avg - 14 - avgPeriod - 5),
            ovulation: 5,
            luteal: 14,
          };
          const pct = Math.max(0, Math.min(100, (durations[phase] / avg) * 100));
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
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pMeta.color, opacity: isCurrent ? 1 : 0.4 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
