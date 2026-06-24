// Warm, varied micro-copy pools so the app never feels like it's repeating itself.
// Every toast pulls a random line from its pool. Keep all of these kind, gentle,
// and human, and never use an em dash.

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Rotates once per day (stable within a day), so daily cards feel fresh over a cycle
// without flickering on every render.
export function pickDaily<T>(arr: readonly T[]): T {
  return arr[Math.floor(Date.now() / 86_400_000) % arr.length];
}

// ─── Toasts ───────────────────────────────────────────────────

export const TOAST = {
  checkinSaved: [
    'Check-in saved ✓',
    'Saved. Thank you for showing up today ✓',
    'Logged with care ✓',
    'Noted. You\'re doing beautifully ✓',
    'Saved for today ✓',
    'Got it. Be kind to yourself ✓',
  ],
  checkinUpdated: [
    'Check-in updated ✓',
    'Updated, thank you ✓',
    'All updated ✓',
    'Changes saved ✓',
    'Tweaked and saved ✓',
  ],
  periodStarted: [
    'Period started. We\'re tracking with you 🩸',
    'Logged. Be gentle with yourself today 🩸',
    'Noted. Rest is more than allowed right now 🩸',
    'Tracking with you. Warmth and softness today 🩸',
    'Got it. Your body is doing real work 🩸',
  ],
  periodLogged: [
    'Period logged ✓',
    'All logged ✓',
    'Got it, period saved ✓',
    'Logged with care ✓',
  ],
  periodEnded: [
    'Period ended. Cycle logged ✓',
    'Cycle complete. You moved through it ✓',
    'Logged. On to the next chapter ✓',
    'Period ended, nicely done ✓',
  ],
  periodRemoved: [
    'Period log removed ✓',
    'Removed, all sorted ✓',
    'Done, that\'s cleared ✓',
  ],
  entrySaved: [
    'Entry saved ✓',
    'Saved. Thank you for checking in ✓',
    'Logged for the day ✓',
    'Noted with care ✓',
  ],
  entryUpdated: [
    'Entry updated ✓',
    'Updated, thank you ✓',
    'All updated ✓',
  ],
  // Errors stay reassuring, never alarming.
  saveError: [
    'Something went wrong, let\'s try that again',
    'That didn\'t save, mind trying once more?',
    'A little hiccup on our end, give it another go',
  ],
  removeError: [
    'Couldn\'t remove that, try again',
    'That didn\'t go through, try once more',
  ],
} as const;
