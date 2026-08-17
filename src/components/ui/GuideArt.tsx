'use client';

// Small line drawings for the guide and for What's new, so a release or a
// section can show the thing rather than only describe it. Everything is drawn
// from the theme tokens (no hardcoded palette beyond the four phase hues), on a
// 200x110 stage, and stays legible on paper and on ink.

import type { GuideArtKind } from '@/lib/guide';
import { PHASE_META, tint } from '@/types/app';

const W = 200;
const H = 110;

const INK = 'var(--color-foreground)';
const MUTED = 'var(--color-foreground-muted)';
const ACCENT = 'var(--color-accent)';
const SURFACE = 'var(--color-surface)';
const PAPER = 'var(--color-surface-solid)';

const PHASES = ['period', 'follicular', 'ovulation', 'luteal'] as const;

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 260, height: 'auto' }} role="presentation">
      {children}
    </svg>
  );
}

/** A rounded card outline, the shape every screen is made of. */
function Card({ x, y, w, h, r = 8, fill = PAPER }: { x: number; y: number; w: number; h: number; r?: number; fill?: string }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />;
}

export function GuideArt({ kind }: { kind: GuideArtKind }) {
  switch (kind) {
    // The dancer, the app's mark, on its paper tile.
    case 'logo':
      return (
        <Stage>
          <defs>
            <clipPath id="nila-guide-tile">
              <rect x={70} y={15} width={60} height={60} rx={16} />
            </clipPath>
          </defs>
          <rect x={70} y={15} width={60} height={60} rx={16} fill="#fdfcf9" />
          <image href="/brand/dancer.png" x={70} y={15} width={60} height={60} clipPath="url(#nila-guide-tile)" />
          <text x={W / 2} y={95} textAnchor="middle" fontSize={13} fill={INK} fontFamily="var(--font-display), Georgia, serif">
            Nila
          </text>
        </Stage>
      );

    // The Today hero: phase ring on the left, the big number on the right.
    case 'phase':
      return (
        <Stage>
          <Card x={16} y={12} w={168} h={86} r={12} />
          <rect x={28} y={22} width={44} height={12} rx={6} fill={tint(PHASE_META.luteal.color, 18)} />
          <circle cx={52} cy={64} r={20} fill="none" stroke={INK} strokeOpacity={0.1} strokeWidth={5} />
          <circle
            cx={52} cy={64} r={20} fill="none" stroke={PHASE_META.luteal.color} strokeWidth={5} strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * 0.35}
            transform="rotate(-90 52 64)"
          />
          <text x={52} y={69} textAnchor="middle" fontSize={13} fill={PHASE_META.luteal.color} fontFamily="var(--font-display), Georgia, serif">6</text>
          <text x={88} y={62} fontSize={26} fill={INK} fontFamily="var(--font-display), Georgia, serif">12</text>
          <rect x={89} y={70} width={68} height={5} rx={2.5} fill={MUTED} opacity={0.35} />
          <rect x={89} y={80} width={44} height={5} rx={2.5} fill={MUTED} opacity={0.22} />
        </Stage>
      );

    // The four-band cycle timeline with today's marker.
    case 'timeline': {
      const spans = [0.18, 0.36, 0.16, 0.3];
      let x = 20;
      return (
        <Stage>
          <text x={20} y={30} fontSize={9} fill={MUTED} fontWeight={700}>YOUR WHOLE CYCLE</text>
          {spans.map((s, i) => {
            const w = s * 160 - 3;
            const el = <rect key={PHASES[i]} x={x} y={44} width={w} height={9} rx={4.5} fill={tint(PHASE_META[PHASES[i]].color, 60)} />;
            x += s * 160;
            return el;
          })}
          <rect x={20 + 160 * 0.62 - 1.5} y={39} width={3} height={19} rx={1.5} fill={INK} />
          <text x={20 + 160 * 0.62} y={72} textAnchor="middle" fontSize={8} fill={MUTED}>today</text>
          <path d="M20 92 C50 92 58 76 76 76 C96 76 104 92 130 88 C152 85 164 80 180 78"
            fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" />
        </Stage>
      );
    }

    // The berry "Log period" pill with its droplet.
    case 'period':
      return (
        <Stage>
          <rect x={24} y={40} width={152} height={30} rx={15} fill={ACCENT} />
          <path d="M64 47.5c3 3.6 4.9 6 4.9 8.4a4.9 4.9 0 0 1-9.8 0c0-2.4 1.9-4.8 4.9-8.4z"
            fill="none" stroke="var(--color-on-accent)" strokeWidth={2} strokeLinejoin="round" />
          <rect x={76} y={52} width={62} height={6} rx={3} fill="var(--color-on-accent)" opacity={0.9} />
          <text x={W / 2} y={88} textAnchor="middle" fontSize={9} fill={MUTED}>one tap when it starts</text>
        </Stage>
      );

    // Mood row above the energy bars: the quick check-in card.
    case 'checkin':
      return (
        <Stage>
          <Card x={16} y={12} w={168} h={86} r={12} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={26 + i * 30} y={24} width={26} height={26} rx={8}
              fill={i === 2 ? 'var(--color-accent-soft)' : SURFACE}
              stroke={i === 2 ? ACCENT : 'none'} strokeWidth={1.5} />
          ))}
          <rect x={26} y={60} width={148} height={1} fill="var(--color-border)" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={26 + i * 30} y={84 - (i + 1) * 3.4} width={26} height={(i + 1) * 3.4} rx={3}
              fill={i <= 2 ? ACCENT : SURFACE} />
          ))}
        </Stage>
      );

    // A month of phase-tinted cells with a ring on today.
    case 'calendar':
      return (
        <Stage>
          {Array.from({ length: 21 }, (_, i) => {
            const col = i % 7;
            const row = Math.floor(i / 7);
            const phase = i < 4 ? 'period' : i < 11 ? 'follicular' : i < 14 ? 'ovulation' : 'luteal';
            return (
              <g key={i}>
                <rect x={30 + col * 20} y={18 + row * 20} width={17} height={17} rx={5}
                  fill={tint(PHASE_META[phase].color, 20)} />
                {i < 4 && <circle cx={38.5 + col * 20} cy={31 + row * 20} r={1.4} fill={PHASE_META.period.color} />}
              </g>
            );
          })}
          <rect x={30 + 3 * 20} y={18 + 20} width={17} height={17} rx={5} fill="none" stroke={ACCENT} strokeWidth={1.6} />
          <rect x={30} y={86} width={140} height={12} rx={6} fill="var(--color-accent-soft)" />
        </Stage>
      );

    // A rising line over quiet bars: your rhythm over time.
    case 'insights':
      return (
        <Stage>
          {[26, 40, 34, 52, 46, 62].map((h, i) => (
            <rect key={i} x={26 + i * 26} y={84 - h} width={16} height={h} rx={4} fill={SURFACE} />
          ))}
          <path d="M34 60 L60 48 L86 54 L112 34 L138 40 L164 24"
            fill="none" stroke={ACCENT} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          {[60, 48, 54, 34, 40, 24].map((y, i) => (
            <circle key={i} cx={34 + i * 26} cy={y} r={2.6} fill={ACCENT} />
          ))}
          <rect x={26} y={90} width={148} height={4} rx={2} fill={MUTED} opacity={0.15} />
        </Stage>
      );

    // A padlock over scrambled bytes: nothing readable leaves the device.
    case 'privacy':
      return (
        <Stage>
          <rect x={82} y={30} width={36} height={26} rx={7} fill="none" stroke={ACCENT} strokeWidth={2.4} />
          <path d="M90 30v-6a10 10 0 0 1 20 0v6" fill="none" stroke={ACCENT} strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={100} cy={43} r={2.6} fill={ACCENT} />
          {[0, 1, 2].map((r) => (
            <g key={r}>
              {Array.from({ length: 9 }, (_, i) => (
                <rect key={i} x={30 + i * 16} y={70 + r * 10} width={11} height={4} rx={2}
                  fill={MUTED} opacity={0.35 - r * 0.09} />
              ))}
            </g>
          ))}
        </Stage>
      );

    // The three states of the sync dot.
    case 'sync':
      return (
        <Stage>
          {[
            { c: '#c0392b', label: 'offline' },
            { c: '#b7902a', label: 'syncing' },
            { c: '#5f9e6b', label: 'synced' },
          ].map(({ c, label }, i) => (
            <g key={label}>
              <circle cx={44 + i * 56} cy={46} r={9} fill={c} />
              <circle cx={44 + i * 56} cy={46} r={15} fill="none" stroke={c} strokeOpacity={0.25} strokeWidth={2} />
              <text x={44 + i * 56} y={80} textAnchor="middle" fontSize={9} fill={MUTED}>{label}</text>
            </g>
          ))}
        </Stage>
      );

    // Seven papers, each with its accent.
    case 'themes': {
      const swatches: [string, string][] = [
        ['#faf9f6', '#8e3b5c'], ['#fff6f7', '#c0506f'], ['#faf8ff', '#6f5cc4'],
        ['#f6f8ee', '#5e7a35'], ['#1a1a18', '#e0789c'], ['#1b1826', '#b79ce8'],
      ];
      return (
        <Stage>
          {swatches.map(([paper, accent], i) => (
            <g key={paper + accent}>
              <rect x={22 + (i % 3) * 56} y={18 + Math.floor(i / 3) * 44} width={44} height={34} rx={9}
                fill={paper} stroke={INK} strokeOpacity={0.1} strokeWidth={1} />
              <circle cx={44 + (i % 3) * 56} cy={35 + Math.floor(i / 3) * 44} r={7} fill={accent} />
            </g>
          ))}
        </Stage>
      );
    }

    // A bell with quiet hours either side of it.
    case 'reminders':
      return (
        <Stage>
          <path d="M100 26a14 14 0 0 0-14 14c0 12-4 16-4 16h36s-4-4-4-16a14 14 0 0 0-14-14z"
            fill="none" stroke={ACCENT} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M94 62a6 6 0 0 0 12 0" fill="none" stroke={ACCENT} strokeWidth={2.4} strokeLinecap="round" />
          <rect x={24} y={80} width={54} height={8} rx={4} fill={MUTED} opacity={0.2} />
          <rect x={122} y={80} width={54} height={8} rx={4} fill={MUTED} opacity={0.2} />
          <text x={W / 2} y={87} textAnchor="middle" fontSize={9} fill={MUTED}>quiet hours</text>
        </Stage>
      );

    // A message written in Settings, and where it gets to: the two kinds as the
    // sheet offers them, a report somebody wrote with the version the app
    // attaches underneath, and the line that comes back once it lands.
    case 'message':
      return (
        <Stage>
          {/* The two tabs, the left one chosen. */}
          <Card x={24} y={12} w={152} h={18} r={9} fill={SURFACE} />
          <Card x={26} y={14} w={74} h={14} r={7} />
          <text x={63} y={24} textAnchor="middle" fontSize={8} fill={INK}>broken</text>
          <text x={139} y={24} textAnchor="middle" fontSize={8} fill={MUTED}>an idea</text>

          {/* What they wrote, and the line the app adds for them. */}
          <Card x={24} y={38} w={152} h={44} />
          <rect x={34} y={48} width={116} height={4} rx={2} fill={MUTED} opacity={0.35} />
          <rect x={34} y={57} width={132} height={4} rx={2} fill={MUTED} opacity={0.35} />
          <rect x={34} y={66} width={64} height={4} rx={2} fill={ACCENT} opacity={0.45} />
          <text x={112} y={70} fontSize={7} fill={MUTED}>Nila 2.5.0 · iPhone</text>

          {/* It arrived. */}
          <circle cx={82} cy={96} r={7} fill={ACCENT} />
          <path d="M78.5 96l2.5 2.5 4.5-5" fill="none" stroke={PAPER} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <text x={95} y={99} fontSize={8} fill={MUTED}>it is with them</text>
        </Stage>
      );
  }
}
