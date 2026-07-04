import Link from 'next/link';

// Shown for any unknown route. Calm, on-brand, one way back home.
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="text-4xl select-none">🌒</div>
      <div>
        <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
          Nothing here
        </h1>
        <p
          className="text-sm max-w-[260px] leading-relaxed"
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          This page doesn&apos;t exist. Let&apos;s get you back.
        </p>
      </div>
      <Link
        href="/home"
        className="px-6 py-2.5 rounded-full text-sm font-medium"
        style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
      >
        Back home
      </Link>
    </div>
  );
}
