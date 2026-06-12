// Bumped with every push that ships user-facing changes.
// Add a new entry to CHANGELOG (most recent first) alongside the bump.
export const APP_VERSION = '1.1.0';

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
