'use client';

// One expandable release in the guide's "What's new" pane. Tapping the row
// reveals its highlights and, when the release carries them, the followable
// steps for finding what it brought. Feature releases are tinted berry and
// badged; small fixes stay quiet.

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChangelogEntry } from '@/lib/version';
import { GuideArt } from '@/components/ui/GuideArt';

export function ReleaseRow({ release, defaultOpen }: { release: ChangelogEntry; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="overflow-hidden rounded-[var(--radius)]"
      style={
        release.major
          ? { background: 'var(--color-accent-soft)' }
          : { background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }
      }
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span
          className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          {release.version}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold">{release.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-foreground-muted)' }}>
              {new Date(release.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {release.major && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
              >
                Major
              </span>
            )}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
          style={{ color: 'var(--color-foreground-muted)' }}
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {release.art && (
              <div className="mx-3.5 mb-4 flex justify-center rounded-[var(--radius-sm)] px-4 py-5"
                style={{ background: 'var(--color-surface)' }}>
                <GuideArt kind={release.art} />
              </div>
            )}

            <div className="px-3.5">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-foreground-muted)' }}>
                What changed
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {release.highlights.map((note, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'var(--color-accent)' }} />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {release.howTo && release.howTo.length > 0 && (
              <div className="mt-5 px-3.5">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-foreground-muted)' }}>
                  How to find it
                </p>
                <ol className="mt-2 flex flex-col gap-2">
                  {release.howTo.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                      <span
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
                        style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                      >
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
