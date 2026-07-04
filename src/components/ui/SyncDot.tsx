'use client';

// Status indicator + sync sheet. Three calm states, always visible so you can
// tell at a glance where your data stands:
//   red    offline (changes are saved on this device, will sync on reconnect)
//   gold   syncing (pushing new writes up, pulling the latest down)
//   green  everything is up to date
// Tapping it opens a sheet to sync on demand, which also pulls the newest data
// from your other devices and checks for a new app version, all without closing
// and reopening the app. Modelled on the same indicator in the sibling app.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSyncState } from '@/lib/sync/status';
import { flushOutbox } from '@/lib/data/outbox';
import { useAppData } from '@/lib/data/context';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { APP_VERSION } from '@/lib/version';

const STATES = {
  offline: {
    color: '#c0392b',
    label: 'Offline',
    heading: "You're offline",
    body: 'Your changes are saved on this device and will sync the moment you reconnect. Nothing is lost.',
  },
  syncing: {
    color: '#b7902a',
    label: 'Syncing',
    heading: 'Syncing your data',
    body: 'Sending up anything new and pulling the latest from your account.',
  },
  synced: {
    color: '#5f9e6b',
    label: 'Synced',
    heading: "Everything's up to date",
    body: 'Your cycle and journal are in sync across your devices.',
  },
} as const;

export function SyncDot() {
  const { online, pending, queued } = useSyncState();
  const { refresh } = useAppData();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const syncing = running || pending > 0 || queued > 0;
  const key = !online ? 'offline' : syncing ? 'syncing' : 'synced';
  const state = STATES[key];

  async function handleSync() {
    if (!online || running) return;
    setRunning(true);
    try {
      // Push queued writes up, pull the latest down, and quietly check for a new
      // app version so a manual sync also refreshes the app itself.
      await flushOutbox();
      await refresh();
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        await reg?.update();
      } catch {}
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Sync status: ${state.label}. Open to sync.`}
        className="fixed z-30 rounded-full p-2"
        style={{
          // Sit up in the top safe-area strip (beside the Dynamic Island / notch),
          // so the dot lives in the chrome rather than floating over page content.
          // Falls back to a small inset on devices with no top inset (iPad, desktop).
          top: 'max(0.5rem, calc(env(safe-area-inset-top) - 1.7rem))',
          right: 'calc(env(safe-area-inset-right) + 0.7rem)',
        }}
      >
        <motion.span
          className="block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: state.color }}
          animate={key === 'syncing' ? { opacity: [0.45, 1, 0.45], scale: [0.9, 1, 0.9] } : { opacity: 1, scale: 1 }}
          transition={key === 'syncing' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} maxHeight="60vh">
        <div className="px-6 pt-3 pb-6 flex flex-col gap-4">
          <h2 className="font-display text-xl font-bold">Sync</h2>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: state.color }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{state.heading}</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>{state.body}</p>

          {online ? (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="w-full rounded-full py-3 text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
            >
              {syncing ? 'Syncing…' : key === 'synced' ? 'Sync again' : 'Sync now'}
            </button>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground-muted)', opacity: 0.8 }}>
              Connect to the internet to sync. Your changes stay safe here until then, and go up on their own once you&apos;re back.
            </p>
          )}

          <p className="text-center text-xs" style={{ color: 'var(--color-foreground-muted)', opacity: 0.7 }}>
            Nila {APP_VERSION}. Syncing also checks for a new version.
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
