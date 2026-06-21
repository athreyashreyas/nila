// Bumped with every push that ships user-facing changes.
// Add a new entry to CHANGELOG (most recent first) alongside the bump.
export const APP_VERSION = '2.0.2';

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.0.2',
    date: '2026-06-22',
    highlights: [
      'The Save check-in button now appears as soon as you set a mood, energy, flow, or symptom, and you can save a check-in without picking a mood',
    ],
  },
  {
    version: '2.0.1',
    date: '2026-06-22',
    highlights: [
      'Logging a period or entry now shows up on your other devices right away, no more waiting or pulling to refresh',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-06-22',
    highlights: [
      'Brand new look: Berry Wine, a warm rose theme with parchment surfaces and a serif display font',
      'Redesigned buttons, cards, and inputs throughout the app with softer shadows and rings instead of borders',
      'Smoother, more realistic hormone graph on the Today screen',
      'Recoloured period, follicular, ovulation, and luteal phase colours for clearer contrast against the new theme',
      'Updated app icon and splash screens to match Berry Wine',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-06-14',
    highlights: [
      'New dark theme: Lavender Dusk, a calmer, softer evening palette',
      'Fixed calendar showing "Period" for a day after its period was edited or removed',
      'Updated the app icon to match the new dark theme',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-12',
    highlights: [
      'Softer, warmer wording throughout the app',
      'Tidied up punctuation in messages and tips for a calmer feel',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-12',
    highlights: [
      'Added in-app version number and changelog (Settings → What\'s new)',
      'Calendar: edit or delete a past period\'s start/end dates',
      'Fixed "logged by mistake, undo" leaving stale entries on the calendar',
      'Simplified calendar dots to show period days only',
      'Smart period logging with past-date support and explicit "End period" flow',
      'Daily insight card with pattern-aware tips',
      'Smoother hormone graph and clearer period status states',
    ],
  },
];
