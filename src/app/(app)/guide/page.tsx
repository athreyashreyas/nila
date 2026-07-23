'use client';

/**
 * The two-sided guide, the same shape as Harmony's and Hisaab's: "What's new"
 * reads the changelog, "Guide" is the evergreen walk-through from guide.ts.
 *
 * Entry intent comes from ?pane= — onboarding sends people to the walk-through
 * (?pane=guide), a version bump auto-opens What's new (?pane=new), and Settings
 * opens either. It lives inside the app shell but hides the bottom nav and the
 * sync dot, so it reads as a full screen you step into and back out of.
 */

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GUIDE, type GuideSection } from '@/lib/guide';
import { APP_VERSION, CHANGELOG } from '@/lib/version';
import { GuideArt } from '@/components/ui/GuideArt';
import { ReleaseRow } from '@/components/ui/ReleaseRow';

type Pane = 'new' | 'guide';

function Section({ section }: { section: GuideSection }) {
  return (
    <section className="pt-7" style={{ borderTop: '1px solid var(--color-border)' }}>
      <h2 className="font-display text-[22px] leading-tight">{section.title}</h2>

      <div className="mt-4 flex justify-center rounded-[var(--radius)] px-4 py-6"
        style={{ background: 'var(--color-surface-solid)', boxShadow: 'var(--shadow-card)' }}>
        <GuideArt kind={section.art} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {section.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed">{p}</p>
        ))}
      </div>

      {section.steps && (
        <ul className="mt-4 flex flex-col gap-2">
          {section.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
              <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'var(--color-accent)' }} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GuideBody() {
  const router = useRouter();
  const params = useSearchParams();

  // The entry intent, read once. Switching tabs changes `pane` but not the URL,
  // so this keeps meaning "where did they come in from".
  const entryPane = params.get('pane');
  const [pane, setPane] = useState<Pane>(entryPane === 'guide' ? 'guide' : 'new');
  const [historyOpen, setHistoryOpen] = useState(false);

  const latest = CHANGELOG[0];
  const earlier = CHANGELOG.slice(1);

  // Where "back" goes is a matter of where they came in. Onboarding and the
  // version check both arrive by `replace`, so there is no useful history behind
  // this screen: go forward to Home rather than back into setup. Settings says
  // so explicitly, and gets its own screen back.
  const done = () => router.replace(params.get('from') === 'settings' ? '/settings' : '/home');

  return (
    <div className="px-5 pt-3 pb-12">
      <div className="flex items-center justify-between">
        <button
          onClick={done}
          aria-label="Back to Nila"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-xs tabular-nums" style={{ color: 'var(--color-foreground-muted)', opacity: 0.7 }}>
          Nila {APP_VERSION}
        </span>
      </div>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-foreground-muted)' }}>
        How Nila works
      </p>
      <h1 className="mt-1 font-display text-[28px] leading-tight">
        Your cycle, kept quietly.
      </h1>

      {/* Two sides: what changed, and the lasting walk-through. */}
      <div role="tablist" aria-label="Guide" className="mt-6 flex gap-1 rounded-full p-1"
        style={{ background: 'var(--color-surface)' }}>
        {([['new', "What's new"], ['guide', 'Guide']] as const).map(([value, label]) => {
          const active = pane === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPane(value)}
              className="flex-1 rounded-full py-2 text-sm font-semibold"
              style={{
                background: active ? 'var(--color-surface-solid)' : 'transparent',
                boxShadow: active ? 'var(--shadow-card)' : 'none',
                color: active ? 'var(--color-foreground)' : 'var(--color-foreground-muted)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {pane === 'new' ? (
        <div className="mt-7">
          <ReleaseRow release={latest} defaultOpen />

          {earlier.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setHistoryOpen((o) => !o)}
                aria-expanded={historyOpen}
                className="flex w-full items-center justify-between py-2 text-left"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-foreground-muted)' }}>
                  Earlier versions
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    color: 'var(--color-foreground-muted)',
                    transform: historyOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              {historyOpen && (
                <div className="mt-2 flex flex-col gap-2">
                  {earlier.map((release) => (
                    <ReleaseRow key={release.version} release={release} defaultOpen={false} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {GUIDE.map((section) => (
            <Section key={section.id} section={section} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={done}
        className="mt-10 w-full rounded-full py-3.5 text-sm font-semibold"
        style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
      >
        Back to Nila
      </button>
    </div>
  );
}

export default function GuidePage() {
  // useSearchParams needs a Suspense boundary to keep the route statically
  // renderable; the fallback is never seen in practice on a client navigation.
  return (
    <Suspense fallback={null}>
      <GuideBody />
    </Suspense>
  );
}
