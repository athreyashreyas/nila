'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useSendFeedback } from '@/hooks/useSendFeedback';
import {
  FEEDBACK_KINDS,
  MAX_FEEDBACK_LENGTH,
  feedbackError,
  type FeedbackKind,
} from '@/lib/feedback';

/** The counter stays out of sight until the end is actually in view. */
const COUNTER_FROM = Math.round(MAX_FEEDBACK_LENGTH * 0.8);

/**
 * Writing to the creator, from Settings.
 *
 * The sheet is built around one promise it has to keep: that a message genuinely
 * goes somewhere. So it has two endings and neither is a shrug. It went, or it
 * is saved and will go on its own. Both say plainly what happened and what
 * comes next.
 */
export function FeedbackSheet({
  kind,
  onClose,
}: {
  /** The kind to open on, or null when the sheet is closed. */
  kind: FeedbackKind | null;
  onClose: () => void;
}) {
  const open = kind !== null;
  const { state, account, send, reset } = useSendFeedback();

  const [active, setActive] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Every opening starts clean, on whichever kind was tapped in Settings.
  useEffect(() => {
    if (!kind) return;
    setActive(kind);
    setMessage('');
    setError(null);
    reset();
  }, [kind, reset]);

  const copy = FEEDBACK_KINDS[active];
  const sending = state === 'sending';

  async function handleSend() {
    const problem = feedbackError(message);
    setError(problem);
    if (problem) return;
    const outcome = await send(active, message);
    if (outcome === 'failed') {
      setError(
        'That could not be saved on this device just now. Your words are still here, so please try again.'
      );
    }
  }

  function chooseKind(next: FeedbackKind) {
    setActive(next);
    setError(null);
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      {state === 'sent' || state === 'queued' ? (
        <Delivered queued={state === 'queued'} account={account} onClose={onClose} />
      ) : (
        <div className="px-5 pt-2 pb-4 flex flex-col gap-4">
          <h2 className="font-display text-xl">Make Nila yours</h2>

          <div className="flex gap-1.5 p-1 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-surface)' }}>
            <KindTab
              active={active === 'bug'}
              onClick={() => chooseKind('bug')}
              label={FEEDBACK_KINDS.bug.label}
            />
            <KindTab
              active={active === 'idea'}
              onClick={() => chooseKind('idea')}
              label={FEEDBACK_KINDS.idea.label}
            />
          </div>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
            {copy.prompt}
          </p>

          <div>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(null);
              }}
              rows={6}
              maxLength={MAX_FEEDBACK_LENGTH + 200}
              placeholder={copy.placeholder}
              aria-label={copy.label}
              className="w-full resize-none px-4 py-3 rounded-[var(--radius-sm)] text-sm leading-relaxed outline-none"
              style={{
                background: 'var(--color-background)',
                boxShadow: 'inset 0 0 0 1px var(--color-border)',
                color: 'var(--color-foreground)',
              }}
            />
            {message.length > COUNTER_FROM && (
              <p className="mt-1.5 text-right text-xs tabular-nums opacity-50">
                {MAX_FEEDBACK_LENGTH - message.trim().length} left
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
            This goes to the person who makes Nila. Nothing you have logged is
            attached to it.
            {account ? ` Replies come to ${account}.` : ''}
          </p>

          {/* A line is always held here, so an error arriving never shoves the
              button out from under a thumb already on its way to it. */}
          <p className="min-h-5 text-sm" style={{ color: '#f87171' }}>
            {error}
          </p>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="py-3 rounded-full text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            {sending ? 'Sending…' : 'Send it over'}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

/**
 * The moment the promise is kept, either way it went. "Thanks for your
 * feedback!" tells somebody nothing, so this says where the message is, who
 * reads it, and what happens next.
 */
function Delivered({
  queued,
  account,
  onClose,
}: {
  queued: boolean;
  account: string | null;
  onClose: () => void;
}) {
  return (
    <div className="px-5 pt-2 pb-4">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: queued ? 'var(--color-surface)' : 'var(--color-accent)',
          color: queued ? 'var(--color-foreground-muted)' : 'var(--color-on-accent)',
        }}
      >
        {queued ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18M8.5 6.5A6 6 0 0 1 18 11h1a4 4 0 0 1 2.4 7.2M6 10a4 4 0 0 0 0 8h9" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </motion.div>

      <p className="text-center font-display text-xl">
        {queued ? 'Kept safe, and it will go on its own.' : 'It is with them.'}
      </p>

      <div
        className="mx-auto mt-3 max-w-sm flex flex-col gap-2.5 text-center text-sm leading-relaxed"
        style={{ color: 'var(--color-foreground-muted)' }}
      >
        {queued ? (
          <p>
            There was no connection just now, so it is waiting on your device.
            Nila sends it as soon as you are back online, even if you never open
            the app again.
          </p>
        ) : (
          <p>
            Your version and the sort of device you are on went with it, so they
            can picture the screen you were looking at.
          </p>
        )}
        <p>
          Nila is made and looked after by one person. They read everything that
          arrives, and answer when there is something worth saying. A good deal of
          the app began as somebody writing in.
        </p>
        {account && (
          <p>
            Replies come to{' '}
            <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>
              {account}
            </span>
            .
          </p>
        )}
        <p className="opacity-60">Thank you for the time it took to write.</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full py-3 rounded-full text-sm font-semibold"
        style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)' }}
      >
        Close
      </button>
    </div>
  );
}

function KindTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
      style={{
        background: active ? 'var(--color-surface-solid)' : 'transparent',
        boxShadow: active ? 'var(--shadow-card)' : 'none',
        color: active ? 'var(--color-foreground)' : 'var(--color-foreground-muted)',
      }}
    >
      {label}
    </button>
  );
}
