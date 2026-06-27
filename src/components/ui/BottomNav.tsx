'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// iOS lifts position:fixed elements above the on-screen keyboard, which would
// leave the nav floating over the page while typing (e.g. journal notes). So we
// hide the nav whenever a text field is focused and bring it back on blur.
function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT' || el.isContentEditable;
}

function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target)) setOpen(true);
    };
    const onFocusOut = () => {
      // Defer so moving between two fields doesn't flicker the nav.
      setTimeout(() => setOpen(isTextField(document.activeElement)), 0);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  return open;
}

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

const TABS = [
  { href: '/home',     label: 'Today',    Icon: HomeIcon },
  { href: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { href: '/insights', label: 'Insights', Icon: InsightsIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-start justify-around border-t"
      style={{
        background: 'var(--color-background)',
        borderColor: 'var(--color-border)',
        paddingTop: '8px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        borderTopWidth: '1.5px',
        // Slide fully out of view while typing so iOS can't float it over the page.
        transform: keyboardOpen ? 'translateY(110%)' : 'translateY(0)',
        opacity: keyboardOpen ? 0 : 1,
        pointerEvents: keyboardOpen ? 'none' : 'auto',
        transition: 'transform 0.2s ease, opacity 0.2s ease',
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.88)')}
            onPointerUp={(e) => (e.currentTarget.style.transform = '')}
            onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
            className="flex flex-col items-center gap-1 px-5 py-1 rounded-2xl"
            style={{
              background: active ? 'var(--color-accent-soft)' : 'transparent',
              color: active ? 'var(--color-accent)' : 'var(--color-foreground)',
              opacity: active ? 1 : 0.42,
              transition: 'opacity 0.12s ease, background 0.12s ease, transform 0.09s ease',
            }}
          >
            <Icon />
            <span className="text-[10px] font-bold tracking-wide">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
