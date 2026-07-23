// The app's line-icon language: 24x24 grid, stroke `currentColor`, 2px, round
// caps and joins. These replace the decorative emoji that used to sit beside
// labels and in buttons. Emoji now live in exactly one place: mood selection.

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function base({ size = 18, className = '', strokeWidth = 2 }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };
}

export function DropletIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3.2c3.4 4 5.5 6.7 5.5 9.4a5.5 5.5 0 0 1-11 0c0-2.7 2.1-5.4 5.5-9.4z" />
    </svg>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SparkIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9-4.9-1.9 4.9-1.9L12 3.5z" />
      <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
    </svg>
  );
}

export function LeafIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M20 4c0 8.2-4.2 12.4-9.5 12.4A5.5 5.5 0 0 1 5 10.9C5 6.4 10.7 4 20 4z" />
      <path d="M4.5 20c2.8-4.3 6.3-7.4 10.5-9.4" />
    </svg>
  );
}

export function BoltIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M13.5 2.5L5 13.5h5.5L10 21.5 19 10.5h-5.6l.1-8z" />
    </svg>
  );
}

export function MoonIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8z" />
    </svg>
  );
}

export function ChartIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 16.5l4.5-5 3.5 3 4-6.5" />
      <path d="M4 20.5h16" />
    </svg>
  );
}

export function NoteIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 4.5h9.5L19 9v10.5H5z" />
      <path d="M14 4.5V9h5" />
      <path d="M8.5 13h7M8.5 16.2h4.5" />
    </svg>
  );
}
