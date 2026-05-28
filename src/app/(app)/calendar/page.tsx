'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/lib/data/context';
import { PHASE_META } from '@/types/app';
import { getDaysInMonth, getFirstDayOfMonth, toISODate, addDays } from '@/lib/utils/dates';
import type { CyclePhase, PredictionResult } from '@/types/app';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getPhaseForDate(date: Date, prediction: PredictionResult): CyclePhase | null {
  const today = new Date();
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  const futureDays = prediction.daysUntilNextPeriod;
  const dayInCycle = ((prediction.estimatedCycleLength - futureDays) + diff) % prediction.estimatedCycleLength;
  if (dayInCycle < 0) return null;

  const p = prediction.estimatedPeriodLength;
  const ov = prediction.estimatedCycleLength - 14;

  if (dayInCycle < p) return 'period';
  if (dayInCycle < ov - 2) return 'follicular';
  if (dayInCycle <= ov + 2) return 'ovulation';
  return 'luteal';
}

export default function CalendarPage() {
  const router = useRouter();
  const { cycles, logs, prediction } = useAppData();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayISO = toISODate(now);

  const periodDates = new Set(
    cycles.flatMap((c) => {
      const start = new Date(c.payload.periodStart);
      const end = c.payload.periodEnd ? new Date(c.payload.periodEnd) : start;
      const days: string[] = [];
      let d = start;
      while (d <= end) { days.push(toISODate(d)); d = addDays(d, 1); }
      return days;
    })
  );

  const logDates = new Set(logs.map((l) => l.payload.date));

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const monthName = new Date(year, month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="px-5 pt-4 pb-28">
      <div className="flex items-center justify-between mb-5 pt-2">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full text-lg" style={{ color: 'var(--color-accent)' }}>‹</button>
          <span className="text-sm font-semibold min-w-[120px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full text-lg" style={{ color: 'var(--color-accent)' }}>›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--color-foreground-muted)' }}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const iso = toISODate(date);
          const isToday = iso === todayISO;
          const hasPeriod = periodDates.has(iso);
          const hasLog = logDates.has(iso);
          const phase = getPhaseForDate(date, prediction);
          const phaseMeta = phase ? PHASE_META[phase] : null;

          return (
            <button
              key={day}
              onClick={() => router.push(`/journal/${iso}`)}
              className="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm font-medium transition-all"
              style={{
                background: phaseMeta ? `${phaseMeta.color}28` : 'var(--color-surface)',
                color: isToday ? 'var(--color-accent)' : 'var(--color-foreground)',
                fontWeight: isToday ? 700 : 500,
                border: isToday ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
              }}
            >
              {day}
              <div className="flex gap-0.5 mt-0.5 h-1.5">
                {hasPeriod && <div className="w-1 h-1 rounded-full" style={{ background: PHASE_META.period.color }} />}
                {hasLog && !hasPeriod && <div className="w-1 h-1 rounded-full" style={{ background: 'var(--color-accent)' }} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-6 px-1">
        {(['period', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]).map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: PHASE_META[p].color }} />
            <span className="text-xs" style={{ color: 'var(--color-foreground-muted)' }}>{PHASE_META[p].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
