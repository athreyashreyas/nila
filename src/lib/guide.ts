// The in-app guide content: a short, illustrated walk-through of how Nila works,
// shown from Settings under "How Nila works". Warm and plain, the same voice as
// the rest of the app. Emoji stand in for illustrations so the guide stays light
// and offline-friendly.

export interface GuideSection {
  emoji: string;
  title: string;
  body: string;
}

export const GUIDE: GuideSection[] = [
  {
    emoji: '🌙',
    title: 'Your phase, at a glance',
    body: 'Home shows where you are in your cycle right now, with a gentle note on what that phase tends to ask of you. It updates itself each day.',
  },
  {
    emoji: '🩸',
    title: 'Logging a period',
    body: 'Tap to log when a period starts, and mark when it ends. Your best guess is always fine. The more you log, the better Nila predicts your next one.',
  },
  {
    emoji: '📝',
    title: 'Daily check-ins',
    body: 'Note your mood, energy, flow, symptoms, and anything on your mind. A few taps a day is all it takes, and it quietly builds a picture only you can see.',
  },
  {
    emoji: '🗓️',
    title: 'The calendar',
    body: 'See your history and what is predicted ahead. Tap any day to add or fix a check-in, even one from a while ago.',
  },
  {
    emoji: '💫',
    title: 'Insights',
    body: 'A calm read on your rhythm: cycle lengths, your check-in rhythm, the symptoms that come up most, and a warm note written from your own recent weeks.',
  },
  {
    emoji: '🔒',
    title: 'Private by design',
    body: 'Everything about your body is encrypted on your device before it is ever saved. Nila\'s servers only ever hold scrambled bytes, so no one but you can read your dates, symptoms, or notes.',
  },
  {
    emoji: '🔄',
    title: 'On all your devices',
    body: 'Sign in on your iPhone and iPad and everything is simply there, kept in sync. It works offline too, and catches up the moment you reconnect. The dot in the corner shows where sync stands.',
  },
];
