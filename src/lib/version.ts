// Release notes, newest first. Add an entry at the top for every push that
// ships a user-facing change; the first entry's version is the single source of
// truth for APP_VERSION (see the bottom of this file), so there is only ever one
// number to bump. Keep the tone warm and plain, the app's own voice.

import type { GuideArtKind } from '@/lib/guide';

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date
  // A short name for the release, shown on its row in What's new.
  title: string;
  highlights: string[];
  // Feature releases worth reading get a tint and a badge; fixes stay quiet.
  major?: boolean;
  // Optional, followable steps for finding and using what a release brought,
  // written for how the app works today. Feature releases carry these; small
  // fixes leave them off.
  howTo?: string[];
  // Optional illustration, drawn by GuideArt under an open release, so What's
  // new can show the thing rather than only describe it.
  art?: GuideArtKind;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.5.0',
    date: '2026-08-17',
    major: true,
    title: 'A way to make Nila exactly what you want',
    art: 'message',
    highlights: [
      'If Nila has ever been any good, it is because of the thoughtful voices of everyone who has used it. Settings now has a line straight to the app\'s creator, so that can carry on',
      'Report a bug, suggest a feature, or send a half-formed idea. Bugs are fixed as soon as possible, and ideas are read and considered for the next version',
      'Nothing you have logged travels with it. The message carries your version and the device you are holding, and not one date, symptom or note',
      'Offline, or the message could not get through? Nothing is lost. Nila keeps it on your device and sends it once you are back online, so you can write it and forget it',
      'Replies come back to the email you signed up with, so there is nothing to check and nothing to miss',
    ],
    howTo: [
      'Open Settings and scroll to "Make Nila Yours", then choose whether it is a bug or an idea.',
    ],
  },
  {
    version: '2.4.0',
    date: '2026-07-23',
    major: true,
    title: 'A guide that finds you',
    art: 'logo',
    highlights: [
      'A proper guide, on its own screen, with two sides: "What\'s new" for what changed, and "Guide" for a lasting walk-through of how Nila works',
      'Every section is illustrated, so the guide shows you the thing rather than only describing it',
      'Finish setting up and the walk-through opens by itself, once, as your first stop',
      'Open a new version of Nila and What\'s new greets you, once. Read it on your iPhone and your iPad stays quiet about it',
      'Every release now carries a name and a date, with the feature releases marked, and older versions tucked behind one tap',
    ],
    howTo: [
      'Open Settings, then "How Nila works" for the walk-through, or "What\'s new" for the release notes.',
      'Inside either, use the two tabs at the top to switch between them.',
      'Tap "Earlier versions" at the bottom of What\'s new to read back through Nila\'s history.',
    ],
  },
  {
    version: '2.3.0',
    date: '2026-07-23',
    major: true,
    title: 'One hero, one accent',
    art: 'phase',
    highlights: [
      'A redesigned Today screen built around one hero card: the days until your next period is now the biggest thing on the page',
      'A phase timeline under the hero shows your whole cycle at a glance, with a marker for where today sits',
      'Today\'s focus reads as an editorial line rather than a tinted box, and the daily tip is now a quiet footnote',
      'Mood and energy are merged into a single quick check-in card',
      'Calendar opens with the month in serif and a berry strip showing the likely window for your next period',
      'Insights is now "Your rhythm", with serif figures and a proper editorial note at the top',
      'Settings gains a profile row and a privacy card that says plainly what zero-knowledge encryption means',
      'Decorative emoji are gone everywhere except mood, replaced by one consistent set of line icons',
      'Phase colours now follow whichever theme you pick, so they read cleanly on every palette',
    ],
    howTo: [
      'Open Today to see the new hero card and the phase timeline beneath it.',
      'Tap Calendar to check the likely window for your next period, right above the grid.',
      'Open Settings to find the privacy card and your profile near the top.',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-07-04',
    major: true,
    title: 'Themes, sync, and a warmer read',
    art: 'sync',
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
    title: 'The nav stays put',
    highlights: [
      'Fixed the bottom navigation bar occasionally lifting up and showing a gap beneath it; it now stays pinned to the bottom on every screen',
    ],
  },
  {
    version: '2.1.5',
    date: '2026-06-27',
    title: 'Instant to the touch',
    highlights: [
      'Buttons and tabs now respond the instant you tap them, with a gentle press animation, so nothing feels frozen while a screen opens',
      'Opening a journal entry shows an "Opening" cue right away instead of a pause',
    ],
  },
  {
    version: '2.1.4',
    date: '2026-06-27',
    title: 'No more blank pauses',
    highlights: [
      'Opening a day from the calendar now shows the entry screen instantly with a gentle loading state, no more waiting on a blank pause',
    ],
  },
  {
    version: '2.1.3',
    date: '2026-06-27',
    title: 'Opens straight away',
    highlights: [
      'Much faster and smoother: the app now opens instantly from a local copy of your data, then quietly catches up in the background',
      'Tapping days in the calendar and switching tabs feels snappier, even after months of entries',
    ],
  },
  {
    version: '2.1.2',
    date: '2026-06-24',
    title: 'More ways to say it',
    highlights: [
      'More warmth and variety in the little messages throughout the app, so it feels fresh, not repetitive',
      'New greeting lines, daily focus notes, insight tips, and loading thoughts across every phase',
      'Save and log confirmations now come in many gentle wordings instead of the same one each time',
    ],
  },
  {
    version: '2.1.1',
    date: '2026-06-24',
    title: 'Steadier days and dates',
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
    major: true,
    title: 'A dancer for an icon',
    art: 'logo',
    highlights: [
      'A brand new app icon: an elegant dancer in one flowing brushstroke, the same Berry Wine across every screen and device',
      'Refreshed launch screens to match, with the new mark on a warm parchment backdrop',
    ],
  },
  {
    version: '2.0.2',
    date: '2026-06-22',
    title: 'Save what you like',
    highlights: [
      'The Save check-in button now appears as soon as you set a mood, energy, flow, or symptom, and you can save a check-in without picking a mood',
    ],
  },
  {
    version: '2.0.1',
    date: '2026-06-22',
    title: 'Straight to your other devices',
    highlights: [
      'Logging a period or entry now shows up on your other devices right away, no more waiting or pulling to refresh',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-06-22',
    major: true,
    title: 'Berry Wine',
    art: 'themes',
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
    major: true,
    title: 'Lavender Dusk',
    art: 'themes',
    highlights: [
      'New dark theme: Lavender Dusk, a calmer, softer evening palette',
      'Fixed calendar showing "Period" for a day after its period was edited or removed',
      'Updated the app icon to match the new dark theme',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-12',
    title: 'Softer wording',
    highlights: [
      'Softer, warmer wording throughout the app',
      'Tidied up punctuation in messages and tips for a calmer feel',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-12',
    major: true,
    title: 'Welcome to Nila',
    art: 'calendar',
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

// One number, one place: the newest entry is the running version.
export const APP_VERSION = CHANGELOG[0].version;
