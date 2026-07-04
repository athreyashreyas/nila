'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/lib/data/context';
import { toISODate } from '@/lib/utils/dates';
import { MOOD_EMOJI } from '@/types/app';

export default function JournalPage() {
  const router = useRouter();
  const { logs } = useAppData();
  const todayISO = toISODate(new Date());
  const [, startNav] = useTransition();

  const openEntry = (date: string) => startNav(() => router.push(`/journal/${date}`));
  const press = (e: React.PointerEvent<HTMLButtonElement>, scale = 0.97) => {
    e.currentTarget.style.transform = `scale(${scale})`;
  };
  const release = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = '';
  };

  return (
    <div className="px-5 pt-4 pb-28">
      <div className="flex items-center justify-between pt-2 mb-5">
        <h1 className="font-display text-2xl font-bold">Journal</h1>
        <button
          onPointerDown={(e) => press(e, 0.94)}
          onPointerUp={release}
          onPointerLeave={release}
          onClick={() => openEntry(todayISO)}
          className="px-4 py-2 rounded-full text-xs font-semibold mr-8"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)', transition: 'transform 0.08s ease' }}
        >
          + Today
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 opacity-40 text-sm">
          No entries yet. Tap + Today to start.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log) => {
            const d = new Date(log.payload.date + 'T00:00:00');
            const displayDate = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            const isToday = log.payload.date === todayISO;
            return (
              <button
                key={log.id}
                onPointerDown={(e) => press(e)}
                onPointerUp={release}
                onPointerLeave={release}
                onClick={() => openEntry(log.payload.date)}
                className="flex items-center gap-4 px-4 py-3.5 rounded-[var(--radius)] text-left w-full"
                style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)', transition: 'transform 0.08s ease' }}
              >
                <div className="text-2xl">{log.payload.mood ? MOOD_EMOJI[log.payload.mood] : '·'}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {displayDate}
                    {isToday && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                        Today
                      </span>
                    )}
                  </div>
                  {log.payload.symptoms.length > 0 && (
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-foreground-muted)' }}>
                      {log.payload.symptoms.slice(0, 3).join(', ')}
                      {log.payload.symptoms.length > 3 && ` +${log.payload.symptoms.length - 3}`}
                    </div>
                  )}
                  {log.payload.notes && (
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-foreground-muted)' }}>
                      {log.payload.notes}
                    </div>
                  )}
                </div>
                <div className="text-base opacity-30">›</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
