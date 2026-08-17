// The in-app guide (Settings → How Nila works, and shown once right after
// onboarding). Evergreen: keep this current as features land. The "What's new"
// pane beside it reads the latest release from version.ts, so that half updates
// itself; these sections are the lasting how-to.
//
// Each section names one illustration, drawn by GuideArt, so the guide shows
// rather than only tells.

/** The illustrations GuideArt knows how to draw. */
export type GuideArtKind =
  | 'logo'
  | 'phase'
  | 'timeline'
  | 'period'
  | 'checkin'
  | 'calendar'
  | 'insights'
  | 'privacy'
  | 'sync'
  | 'themes'
  | 'reminders'
  | 'message';

export interface GuideSection {
  id: string;
  title: string;
  body: string[];
  steps?: string[];
  art: GuideArtKind;
}

export const GUIDE: GuideSection[] = [
  {
    id: 'idea',
    title: 'The idea',
    body: [
      'Nila keeps track of your cycle so you do not have to hold it in your head. Log a period when it starts, check in when you feel like it, and Nila learns your rhythm and tells you where you are and what is coming.',
      'It is built for calm, not for streaks. There is nothing to keep up with, and nothing is lost by skipping a day.',
    ],
    art: 'logo',
  },
  {
    id: 'today',
    title: 'Today, at a glance',
    body: [
      'The hero card at the top of Today answers the question you actually came to ask: how many days until your next period. Beside it, a ring shows how far into the current phase you are.',
      'Underneath, a timeline lays out your whole cycle as four bands, period, follicular, ovulation, and luteal, sized to your own estimates, with a marker for where today sits.',
    ],
    steps: [
      'The phase pill at the top left names the phase you are in right now.',
      'Below the hero, "Today\'s focus" is a short line on what this phase tends to ask of you.',
    ],
    art: 'phase',
  },
  {
    id: 'hormones',
    title: 'The hormone graph',
    body: [
      'The graph on Today draws oestrogen, progesterone, and the LH surge across your cycle, with the phases tinted behind them. The dotted line marks today.',
      'Drag across it to scrub to any day and read where each hormone sits. It is a typical cycle scaled to your length, not a measurement of your body, so read it as a map rather than a result.',
    ],
    art: 'timeline',
  },
  {
    id: 'period',
    title: 'Logging a period',
    body: [
      'Tap "Log period" on Today when one starts, and mark it ended when it does. Your best guess is always fine, and you can correct any of it later.',
      'The more periods you log, the better Nila predicts the next one. Two cycles is enough to start; a handful makes it genuinely good.',
    ],
    steps: [
      'Started a few days ago? The log sheet lets you pick the day it actually began.',
      'Logged one by mistake? "Logged by mistake, undo" removes it cleanly.',
    ],
    art: 'period',
  },
  {
    id: 'checkin',
    title: 'Daily check-ins',
    body: [
      'The quick check-in card holds your mood and energy for the day. Flow and symptoms sit below it, and a journal entry takes anything you want to say in your own words.',
      'A few taps is plenty. Over weeks it becomes a picture of your patterns that only you can see.',
    ],
    art: 'checkin',
  },
  {
    id: 'calendar',
    title: 'The calendar',
    body: [
      'The calendar shows your history behind you and the prediction ahead, each day tinted by its phase, with a dot on period days. A strip above the grid names the likely window for your next period.',
      'Tap any day to see what you logged, and to add or fix a check-in, even one from a while back.',
    ],
    steps: [
      'Tap a past period day to correct its start or end dates.',
      'Today is marked with a ring rather than a fill, so it never hides the phase tint.',
    ],
    art: 'calendar',
  },
  {
    id: 'insights',
    title: 'Your rhythm',
    body: [
      'Insights opens with a warm note written from your own recent weeks, then shows your cycle lengths over time, how consistently you check in, and the symptoms that come up most.',
      'It also suggests food and lifestyle for the phase you are in, tuned to whatever you logged today. There is a vegetarian toggle if you want it.',
    ],
    art: 'insights',
  },
  {
    id: 'privacy',
    title: 'Private by design',
    body: [
      'Everything about your body is encrypted on this device before it is sent anywhere. Nila\'s servers hold nothing but scrambled bytes: no dates, no symptoms, no notes, and nothing readable even by whoever runs the server.',
      'That is also why your password matters. Nobody can reset it for you and read your data back, so keep your recovery phrase somewhere safe.',
    ],
    art: 'privacy',
  },
  {
    id: 'sync',
    title: 'Across your devices',
    body: [
      'Sign in on your iPhone and your iPad and everything is simply there, kept in step. It works offline too, saving on the device and catching up the moment you reconnect.',
      'The dot in the top corner shows where things stand. Tap it any time to sync on the spot or pick up a new version.',
    ],
    steps: [
      'Red means offline. Your changes are safe on this device.',
      'Gold means syncing. Green means everything is up to date.',
    ],
    art: 'sync',
  },
  {
    id: 'reminders',
    title: 'Reminders',
    body: [
      'Nila can nudge you when a period is due and, if you like, send a gentle evening note when you have not checked in. You choose quiet hours so nothing arrives overnight.',
      'On iPhone, add Nila to your home screen first: iOS only allows notifications for apps that live there.',
    ],
    art: 'reminders',
  },
  {
    id: 'themes',
    title: 'Make it yours',
    body: [
      'Nila comes in seven looks. By day, Berry, Rose Quartz, Lavender, and Sage; after dark, Berry Dusk and Plum Night; or System, which follows your phone between light and dark.',
      'A theme changes the paper and the accent around your data, never the four phase colours, so your cycle always reads the same way.',
    ],
    steps: ['Open Settings, then Appearance, and tap any theme to switch instantly.'],
    art: 'themes',
  },
  {
    id: 'yours',
    title: 'Making Nila yours',
    body: [
      'One person makes Nila, and Settings has a line straight to them. If something is broken, say so. If the app should do something it does not yet do, say that too. You do not have to be certain, you do not have to be technical, and you do not have to soften it.',
      'Your version and the device you are holding travel with the message, so you can describe what you saw and leave the rest alone. Nothing you have logged goes with it: not a date, not a symptom, not a note.',
      'They read all of it. Bugs are looked at quickly, ideas are thought about properly, and where there is an answer worth giving it comes to the email you signed up with.',
      'Writing it offline is fine. The message waits on your device and goes out by itself the next time you have a connection, so you can close the app and forget you sent it.',
    ],
    steps: [
      'Open Settings and scroll to "Make Nila Yours".',
      'Choose whether it is something broken or an idea, then write as much or as little as you like.',
    ],
    art: 'message',
  },
];
