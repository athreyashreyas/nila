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
      className="fixed bottom-0 inset-x-0 z-50 flex items-start justify-around pt-3 border-t border-[--color-border] bg-[--color-background]"
      style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
    >
      {TABS.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 transition-opacity"
            style={{ opacity: active ? 1 : 0.35 }}
          >
            <span
              className="text-2xl leading-none transition-transform"
              style={{
                color: active ? 'var(--color-accent)' : 'var(--color-foreground)',
                transform: active ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {icon}
            </span>
            <span
              className="text-[10px] font-semibold tracking-wide"
              style={{ color: active ? 'var(--color-accent)' : undefined }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
