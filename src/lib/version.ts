// Bumped with every push that ships user-facing changes.
// Add a new entry to CHANGELOG (most recent first) alongside the bump.
export const APP_VERSION = '2.2.1';

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date
  highlights: string[];
  // Optional, followable steps for finding and using what a release brought,
  // written for how the app works today. Feature releases carry these; small
  // fixes leave them off.
  howTo?: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.2.1',
    date: '2026-07-04',
    highlights: [
      'Fixed the day and period pop-ups getting cropped and stuck behind the tab bar; they now open cleanly over the whole screen again',
      'Tidied the sync dot into the top corner so it sits with the status bar instead of floating over your calendar',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-07-04',
    highlights: [
      'New looks: four more themes to make Nila yours, Rose Quartz, Lavender, Sage, and a soft Plum Night, alongside Berry and Berry Dusk',
      'Everything you log now saves instantly and syncs in the background, so the app never waits on the network, even offline',
      'A calm status dot in the corner shows whether you are synced, syncing, or offline, and you can tap it to sync on demand',
      'Insights now opens with a warm, personal note on your rhythm that reads your own recent weeks and never repeats itself',
      'Richer Insights: a check-in rhythm grid and your most-noted symptoms, drawn from your history',
      'A gentler date picker that stays inside Nila instead of the system wheel',
      'A new "How Nila works" guide in Settings, plus reminders to add Nila to your home screen so notifications can reach you',
      'Reminders can now respect quiet hours, and you can name each device',
      'Faster, calmer, and more reliable throughout, with offline support that actually works and full support for reduced-motion settings',
    ],
    howTo: [
      'Open Settings, then Appearance, to try any of the six themes.',
      'Tap the dot in the top corner any time to check sync or sync now.',
      'Open Insights to read your note and your new rhythm and symptom charts.',
      'In Settings, open "How Nila works" for a quick tour, and set quiet hours under Notifications.',
    ],
  },
  {
    version: '2.1.6',
    date: '2026-06-27',
    highlights: [
      'Fixed the bottom navigation bar occasionally lifting up and showing a gap beneath it; it now stays pinned to the bottom on every screen',
    ],
  },
  {
    version: '2.1.5',
    date: '2026-06-27',
    highlights: [
      'Buttons and tabs now respond the instant you tap them, with a gentle press animation, so nothing feels frozen while a screen opens',
      'Opening a journal entry shows an "Opening" cue right away instead of a pause',
    ],
  },
  {
    version: '2.1.4',
    date: '2026-06-27',
    highlights: [
      'Opening a day from the calendar now shows the entry screen instantly with a gentle loading state, no more waiting on a blank pause',
    ],
  },
  {
    version: '2.1.3',
    date: '2026-06-27',
    highlights: [
      'Much faster and smoother: the app now opens instantly from a local copy of your data, then quietly catches up in the background',
      'Tapping days in the calendar and switching tabs feels snappier, even after months of entries',
    ],
  },
  {
    version: '2.1.2',
    date: '2026-06-24',
    highlights: [
      'More warmth and variety in the little messages throughout the app, so it feels fresh, not repetitive',
      'New greeting lines, daily focus notes, insight tips, and loading thoughts across every phase',
      'Save and log confirmations now come in many gentle wordings instead of the same one each time',
    ],
  },
  {
    version: '2.1.1',
    date: '2026-06-24',
    highlights: [
      'Fixed the period day counter jumping ahead by one later in the day',
      'Your daily greeting line now always matches the phase you\'re actually in',
      'Editing a period or a journal entry no longer gets cleared if your data syncs in the background',
      'Steadier date handling around midnight in your local timezone',
    ],
  },
  {
    version: '2.1.0',
    date: '2026-06-22',
    highlights: [
      'A brand new app icon: an elegant dancer in one flowing brushstroke, the same Berry Wine across every screen and device',
      'Refreshed launch screens to match, with the new mark on a warm parchment backdrop',
    ],
  },
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
