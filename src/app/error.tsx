'use client';

// Catches render errors in any route below the root layout, so a single broken
// screen shows a calm recovery card instead of a white void. The root layout
// (fonts, theme, providers) stays mounted around it.
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface it in the console for debugging; never send anywhere.
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="text-4xl select-none">🌙</div>
      <div>
        <h1
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--color-foreground)' }}
        >
          Something slipped
        </h1>
        <p
          className="text-sm max-w-[260px] leading-relaxed"
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          Your data is safe and untouched. Let&apos;s try that again.
        </p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-full text-sm font-medium"
        style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
      >
        Try again
      </button>
    </div>
  );
}
