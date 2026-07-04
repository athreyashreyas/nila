'use client';

// A small, theme-aware chart kit. Everything is inline SVG with no dependencies,
// coloured from CSS variables so each chart re-themes with the app. Kept
// deliberately minimal and reused across Insights so the whole page reads as one
// system rather than a handful of one-off drawings.

// ─── Sparkline ────────────────────────────────────────────────
// A single trend line with a soft area fill and end dots. Good for cycle length
// over time, or any short numeric series.
export function Sparkline({
  values,
  width = 300,
  height = 120,
  color = 'var(--color-accent)',
  showDots = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    // A little vertical padding so end dots never clip the edge.
    y: height - 6 - ((v - min) / range) * (height - 12),
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <path d={area} fill={color} fillOpacity={0.1} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {showDots && pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />)}
    </svg>
  );
}

// ─── Horizontal bars ──────────────────────────────────────────
// A ranked list of labelled bars, widths normalised to the largest value. Good
// for symptom or mood frequency.
export function Bars({
  data,
  color = 'var(--color-accent)',
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 flex-shrink-0 text-xs capitalize truncate" style={{ color: 'var(--color-foreground)' }}>
            {d.label}
          </span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <span className="w-6 flex-shrink-0 text-right text-[11px] tabular-nums" style={{ color: 'var(--color-foreground-muted)' }}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Check-in heatmap ─────────────────────────────────────────
// A calendar-style grid of the last `weeks` weeks, one cell per day, filled by
// intensity 0..1. Shows at a glance how steadily you have been checking in,
// framed around showing up, never a streak to break.
export function Heatmap({
  days,
  weeks = 12,
  color = 'var(--color-accent)',
}: {
  // Map of ISO date -> intensity 0..1 (e.g. 1 if logged that day).
  days: Map<string, number>;
  weeks?: number;
  color?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Start on the Sunday `weeks` weeks back so columns are clean weeks.
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  start.setDate(start.getDate() - start.getDay());

  const cols: { iso: string; intensity: number; future: boolean }[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w <= weeks; w++) {
    const col: { iso: string; intensity: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10);
      col.push({ iso, intensity: days.get(iso) ?? 0, future: cursor > today });
      cursor.setDate(cursor.getDate() + 1);
    }
    cols.push(col);
  }

  return (
    <div className="flex gap-[3px] overflow-x-auto no-scrollbar">
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((cell) => (
            <div
              key={cell.iso}
              className="rounded-[3px]"
              style={{
                width: 12,
                height: 12,
                background: cell.future
                  ? 'transparent'
                  : cell.intensity > 0
                    ? color
                    : 'var(--color-border)',
                opacity: cell.future ? 0 : cell.intensity > 0 ? 0.35 + cell.intensity * 0.65 : 0.5,
              }}
              title={cell.iso}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
