import { describe, expect, it } from 'vitest';
import {
  MAX_FEEDBACK_LENGTH,
  composeFeedback,
  describeDevice,
  feedbackError,
  type FeedbackContext,
} from '@/lib/feedback';

// The composing and validating half of "Make Nila Yours". Deliberately pure, so
// this suite needs no Supabase client, no IndexedDB, and no DOM.

const ctx: FeedbackContext = {
  version: '2.5.0',
  account: 'someone@example.com',
  device: 'iPhone, installed to the home screen',
  sentAt: '17 August 2026 at 21:40',
};

describe('composeFeedback', () => {
  it("puts the sender's own words first, above the details", () => {
    const { body } = composeFeedback('bug', 'The prediction did not move.', ctx);
    expect(body.startsWith('The prediction did not move.')).toBe(true);
    expect(body).toContain('\n---\n');
  });

  it('attaches the version, device, and time so nobody has to type them', () => {
    const { body } = composeFeedback('bug', 'Something broke.', ctx);
    expect(body).toContain('Nila 2.5.0');
    expect(body).toContain('iPhone, installed to the home screen');
    expect(body).toContain('Sent 17 August 2026 at 21:40');
  });

  it('names the address a reply will reach, and says so', () => {
    const { body } = composeFeedback('idea', 'A thought.', ctx);
    expect(body).toContain('From someone@example.com');
    expect(body).toContain('Replying to this email reaches them.');
  });

  it('says plainly when there is nobody to reply to', () => {
    const { body } = composeFeedback('idea', 'A thought.', { ...ctx, account: null });
    expect(body).toContain('Not signed in');
    expect(body).not.toContain('Replying to this email reaches them.');
  });

  it('tells the two kinds apart in the subject line', () => {
    expect(composeFeedback('bug', 'x y z', ctx).subject).toBe('Nila 2.5.0 · Bug report');
    expect(composeFeedback('idea', 'x y z', ctx).subject).toBe('Nila 2.5.0 · Feature idea');
  });

  it('trims the message so stray whitespace never becomes the first line', () => {
    const { body } = composeFeedback('bug', '   \n  It broke.  \n\n ', ctx);
    expect(body.startsWith('It broke.')).toBe(true);
  });
});

describe('feedbackError', () => {
  it('accepts a message that says enough to act on', () => {
    expect(feedbackError('The calendar is stuck')).toBeNull();
  });

  it('asks for something rather than nothing', () => {
    expect(feedbackError('')).not.toBeNull();
    expect(feedbackError('    ')).not.toBeNull();
  });

  it('asks for more when a couple of characters cannot mean anything', () => {
    expect(feedbackError('hi')).not.toBeNull();
  });

  it('measures length after trimming, so padding cannot pass for words', () => {
    expect(feedbackError('  a  ')).not.toBeNull();
  });

  it('holds the line at the maximum, and complains one character past it', () => {
    expect(feedbackError('a'.repeat(MAX_FEEDBACK_LENGTH))).toBeNull();
    expect(feedbackError('a'.repeat(MAX_FEEDBACK_LENGTH + 1))).not.toBeNull();
  });
});

describe('describeDevice', () => {
  it('names the platform in words rather than a user-agent string', () => {
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', true)).toBe(
      'iPhone, installed to the home screen'
    );
    expect(describeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', false)).toBe(
      'Mac, in the browser'
    );
  });

  it('reads iPad as an iPad, not as a Mac', () => {
    expect(describeDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', false)).toBe(
      'iPad, in the browser'
    );
  });

  it('reads Android before Linux, since every Android is also a Linux', () => {
    expect(describeDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)', true)).toBe(
      'Android, installed to the home screen'
    );
  });

  it('says so plainly when it does not recognise the device', () => {
    expect(describeDevice('some-crawler/1.0', false)).toBe(
      'an unrecognised device, in the browser'
    );
  });
});
