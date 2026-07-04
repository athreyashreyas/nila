'use client';

// A gentle nudge to add Nila to the home screen. This matters on iOS: web push
// and the full-screen app feel only work once Nila is installed from the home
// screen, so onboarding surfaces this, and Settings links back to it. It hides
// itself when already running standalone (nothing left to do).
import { useEffect, useState } from 'react';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt({ compact = false }: { compact?: boolean }) {
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    setStandalone(isStandalone());
  }, []);

  if (standalone) return null;

  const ios = isIOS();

  return (
    <div
      className="rounded-[var(--radius)] p-4 flex flex-col gap-2"
      style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">📲</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
          Add Nila to your home screen
        </h3>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
        {ios ? (
          <>
            Tap the Share button in Safari, then <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>Add to Home Screen</span>. It opens full screen, feels like a real app, and lets reminders reach you.
          </>
        ) : (
          <>
            Use your browser&apos;s menu, then <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>Install app</span> or <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>Add to Home screen</span>, so Nila opens full screen and reminders can reach you.
          </>
        )}
      </p>
      {!compact && ios && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--color-foreground-muted)', opacity: 0.7 }}>
          Reminders on iPhone and iPad only work once Nila is on your home screen.
        </p>
      )}
    </div>
  );
}
