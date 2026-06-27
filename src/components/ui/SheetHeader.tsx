'use client';

import type { ReactNode } from 'react';

// The title + optional subtitle + close button shared by every bottom sheet
// (log period, end period, edit period). Previously copy-pasted into each.
export function SheetHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {subtitle && (
          <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-foreground-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
        style={{ background: 'var(--color-surface)', color: 'var(--color-foreground-muted)' }}
      >
        ✕
      </button>
    </div>
  );
}
