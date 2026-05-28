'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/home',     label: 'Today',    icon: '○' },
  { href: '/calendar', label: 'Calendar', icon: '◫' },
  { href: '/insights', label: 'Insights', icon: '◈' },
  { href: '/settings', label: 'Settings', icon: '◎' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex items-start justify-around pt-2 border-t"
      style={{
        background: 'var(--color-background)',
        borderColor: 'var(--color-border)',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-2xl transition-all"
            style={{
              background: active ? 'var(--color-accent-soft)' : 'transparent',
              opacity: active ? 1 : 0.38,
            }}
          >
            <span
              className="text-xl leading-none"
              style={{ color: active ? 'var(--color-accent)' : 'var(--color-foreground)' }}
            >
              {icon}
            </span>
            <span
              className="text-[10px] font-semibold tracking-wide"
              style={{ color: active ? 'var(--color-accent)' : 'var(--color-foreground)' }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
