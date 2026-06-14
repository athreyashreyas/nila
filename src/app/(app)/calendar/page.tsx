'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EditPeriodSheet } from '@/components/ui/EditPeriodSheet';
import { useAppData } from '@/lib/data/context';
import { PHASE_META } from '@/types/app';
import { getDaysInMonth, getFirstDayOfMonth, toISODate, addDays, fromISODate, startOfDay, daysBetween } from '@/lib/utils/dates';
import { phaseForCycleDay } from '@/lib/algorithm/prediction';
import type { CyclePhase, PredictionResult, MoodLevel } from '@/types/app';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MOOD_EMOJI: Record<MoodLevel, string> = {
  great: '😊', good: '🙂', okay: '😐', low: '😔', 'low-energy': '😴',
};
const MOOD_LABEL: Record<MoodLevel, string> = {
  great: 'Great', good: 'Good', okay: 'Okay', low: 'Low', 'low-energy': 'Tired',
};

function getPhaseForDate(
  date: Date,
  prediction: PredictionResult,
  periodDates: Set<string>,
  todayISO: string,
): CyclePhase | null {
  // No cycle history yet — don't paint a speculative cycle across the whole calendar
  if (!prediction.hasData) return null;
  const { estimatedCycleLength, estimatedPeriodLength, daysUntilNextPeriod } = prediction;
  const diff = daysBetween(startOfDay(new Date()), startOfDay(date));
  const todayCycleDay = estimatedCycleLength - daysUntilNextPeriod;
  const rawDay = todayCycleDay + diff;
  // Normalise to [1, cycleLength]
  const dayInCycle =
    ((rawDay - 1) % estimatedCycleLength + estimatedCycleLength) % estimatedCycleLength + 1;
  if (dayInCycle < 1) return null;
  const phase = phaseForCycleDay(dayInCycle, estimatedCycleLength, estimatedPeriodLength);
  // For past/present days, a logged period that already ended takes priority over
  // the estimated period length, so a finished period doesn't keep showing as "Period"
  // on days the user has since unmarked.
  const iso = toISODate(date);
  if (phase === 'period' && !periodDates.has(iso) && iso <= todayISO) {
    return 'follicular';
  }
  return phase;
}

interface DaySheet {
  iso: string;
  date: Date;
  phase: CyclePhase | null;
  hasPeriod: boolean;
  hasLog: boolean;
  cycleId: string | null;
}

export default function CalendarPage() {
  const router = useRouter();
  const { cycles, logs, prediction, updateCycle, deleteCycle } = useAppData();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tappedDate, setTappedDate] = useState<string | null>(null);
  const [sheet, setSheet] = useState<DaySheet | null>(null);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayISO = toISODate(now);

  const periodDates = new Set(
    cycles.flatMap((c) => {
      const start = fromISODate(c.payload.periodStart);
      const end = c.payload.periodEnd ? fromISODate(c.payload.periodEnd) : start;
      const days: string[] = [];
      let d = start;
      while (d <= end) { days.push(toISODate(d)); d = addDays(d, 1); }
      return days;
    })
  );

  const logMap = new Map(logs.map(l => [l.payload.date, l.payload]));

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const monthName = new Date(year, month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  function openSheet(iso: string, date: Date) {
    const phase = getPhaseForDate(date, prediction, periodDates, todayISO);
    const hasPeriod = periodDates.has(iso);
    const hasLog = logMap.has(iso);
    const cycle = cycles.find((c) => {
      const end = c.payload.periodEnd ?? todayISO;
      return iso >= c.payload.periodStart && iso <= end;
    });
    setSheet({ iso, date, phase, hasPeriod, hasLog, cycleId: cycle?.id ?? null });
  }

  const sheetLog = sheet ? logMap.get(sheet.iso) : null;
  const sheetMeta = sheet?.phase ? PHASE_META[sheet.phase] : null;
  const editingCycle = editingCycleId ? cycles.find((c) => c.id === editingCycleId) ?? null : null;

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
          const phase = getPhaseForDate(date, prediction, periodDates, todayISO);
          const phaseMeta = phase ? PHASE_META[phase] : null;

          return (
            <button
              key={day}
              onPointerDown={() => setTappedDate(iso)}
              onPointerUp={() => setTappedDate(null)}
              onPointerLeave={() => setTappedDate(null)}
              onPointerCancel={() => setTappedDate(null)}
              onClick={() => openSheet(iso, date)}
              className="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm font-medium"
              style={{
                background: phaseMeta ? `${phaseMeta.color}28` : 'var(--color-surface)',
                color: isToday ? 'var(--color-accent)' : 'var(--color-foreground)',
                fontWeight: isToday ? 700 : 500,
                border: isToday ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                transform: tappedDate === iso ? 'scale(0.88)' : 'scale(1)',
                transition: 'transform 0.08s ease',
              }}
            >
              {day}
              <div className="flex gap-0.5 mt-0.5 h-1.5">
                {hasPeriod && <div className="w-1 h-1 rounded-full" style={{ background: PHASE_META.period.color }} />}
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

      {/* Day detail bottom sheet */}
      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} maxHeight="70vh">
        {sheet && (
          <div className="px-6 pt-3 pb-2">
                {/* Date header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-display text-xl font-bold"
                      style={{ color: sheetMeta?.color ?? 'var(--color-foreground)' }}>
                      {sheet.date.toLocaleDateString('en-GB', { weekday: 'long' })}
                    </div>
                    <div className="text-sm mt-0.5" style={{ color: 'var(--color-foreground-muted)' }}>
                      {sheet.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  {sheetMeta && (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full mt-1"
                      style={{ background: `${sheetMeta.color}22`, color: sheetMeta.color }}>
                      {sheetMeta.label}
                    </span>
                  )}
                </div>

                {/* Phase context */}
                {sheetMeta && (
                  <div className="rounded-2xl px-4 py-3 mb-4"
                    style={{ background: `${sheetMeta.color}12`, border: `1px solid ${sheetMeta.color}30` }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
                      {sheetMeta.description}
                    </p>
                  </div>
                )}

                {/* Period indicator */}
                {sheet.hasPeriod && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full" style={{ background: PHASE_META.period.color }} />
                    <span className="text-sm font-medium" style={{ color: PHASE_META.period.color }}>Period day</span>
                  </div>
                )}

                {/* Logged data */}
                {sheetLog ? (
                  <div className="flex flex-col gap-3">
                    {sheetLog.mood && (
                      <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <span className="text-2xl">{MOOD_EMOJI[sheetLog.mood]}</span>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-foreground-muted)' }}>Mood</div>
                          <div className="text-sm font-medium">{MOOD_LABEL[sheetLog.mood]}</div>
                        </div>
                      </div>
                    )}

                    {sheetLog.energy && (
                      <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <span className="text-2xl">⚡</span>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-foreground-muted)' }}>Energy</div>
                          <div className="flex gap-0.5 mt-1">
                            {[1,2,3,4,5].map(n => (
                              <div key={n} className="w-4 h-1.5 rounded-full"
                                style={{ background: n <= (sheetLog.energy ?? 0) ? 'var(--color-accent)' : 'var(--color-border)' }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {sheetLog.flow && sheetLog.flow !== 'none' && (
                      <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <span className="text-2xl">🩸</span>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-foreground-muted)' }}>Flow</div>
                          <div className="text-sm font-medium capitalize">{sheetLog.flow}</div>
                        </div>
                      </div>
                    )}

                    {sheetLog.symptoms.length > 0 && (
                      <div className="rounded-2xl px-4 py-3"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-foreground-muted)' }}>Symptoms</div>
                        <div className="flex flex-wrap gap-1.5">
                          {sheetLog.symptoms.map(s => (
                            <span key={s} className="text-xs px-2.5 py-1 rounded-full"
                              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 opacity-40">
                    <div className="text-3xl mb-2">🌿</div>
                    <p className="text-sm">Nothing logged for this day</p>
                  </div>
                )}

                {/* Add / edit journal entry — only for today or past dates */}
                {sheet.iso <= todayISO && (
                  <button
                    onClick={() => router.push(`/journal/${sheet.iso}`)}
                    className="w-full mt-4 py-3 rounded-[var(--radius)] text-sm font-semibold"
                    style={{ background: 'var(--color-accent)', color: '#fff' }}
                  >
                    {sheet.hasLog ? 'Edit entry' : 'Add entry'}
                  </button>
                )}

                {/* Edit this period's dates */}
                {sheet.hasPeriod && sheet.cycleId && (
                  <button
                    onClick={() => { setEditingCycleId(sheet.cycleId); setSheet(null); }}
                    className="w-full mt-2 py-3 rounded-[var(--radius)] text-sm font-semibold"
                    style={{ background: 'var(--color-surface)', color: PHASE_META.period.color, border: `1px solid ${PHASE_META.period.color}40` }}
                  >
                    Edit period dates
                  </button>
                )}
          </div>
        )}
      </BottomSheet>

      {/* Edit period sheet */}
      {editingCycle && (
        <EditPeriodSheet
          open={!!editingCycle}
          onClose={() => setEditingCycleId(null)}
          cycle={editingCycle}
          cycles={cycles}
          isLatest={cycles[0]?.id === editingCycle.id}
          onConfirm={updateCycle}
          onDelete={deleteCycle}
        />
      )}
    </div>
  );
}
