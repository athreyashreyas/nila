# Nila

A privacy-first menstrual cycle tracking PWA for iPhone and iPad. All health data is encrypted client-side. The server stores only encrypted blobs and never sees period dates, symptoms, mood, or any health content.

Current version: see `src/lib/version.ts` (also shown in-app under Settings → What's new).

## Features

### Cycle tracking and prediction
- **4-phase cycle tracking**: period, follicular, ovulation, luteal, with confidence-weighted prediction from cycle history
- **5-state period status**: none, approaching, late, active (started today), or active (ongoing), each with its own home screen treatment
- **Smart period logging**: log a period for today or any past date, with an optional end date if it's already over
- **Explicit "End period" flow**: end an ongoing period with a date picker defaulting to your last logged flow day
- **Logged by mistake, undo**: remove a period log entirely (today's or an ongoing one) in one tap, including cleanup of any related daily log entry
- **Edit past periods**: from the calendar, adjust a logged period's start/end dates or delete it outright, with validation against future dates and overlapping cycles
- **Predictions recalculate automatically** whenever cycles are added, edited, ended, or removed

### Daily check-ins and insights
- **Daily log**: mood, energy, flow, symptoms, freeform notes
- **Daily insight card**: pattern-aware tips (e.g. "you tend to log cramps in your luteal phase") with a curated phase-tip fallback
- **Hormone graph**: smooth oestrogen/progesterone/LH visualisation, scrub by day
- **Insights tab**: cycle length chart, current-cycle phase breakdown, and phase-aware food/movement/lifestyle recommendations (veg/non-veg toggle)

### Calendar and journal
- **Calendar**: month view with phase shading and period-day markers; today is highlighted with a border
- **Day sheet**: tap any day to see its phase, logged mood/energy/flow/symptoms, and add or edit a journal entry
- **Journal**: per-day editor reachable via the calendar day sheet

### Privacy and account
- **Zero-knowledge E2EE**: master key derived from password via PBKDF2 (600k iterations), never leaves the device
- **12-word recovery phrase**: BIP39 seed for account recovery without password
- **Cross-device sync**: same password unlocks the same data on iPhone and iPad
- **Pull-to-refresh**: drag down to sync across devices

### App
- **Dark/light/system theme**: persists across devices via Supabase preferences
- **In-app changelog**: Settings → What's new shows the current version and recent updates
- **PWA**: installable, works offline, no App Store required
- **Push notification support**: period reminders, toggled in Settings (requires iOS 16.4+ and the app added to the home screen)

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + Framer Motion |
| PWA | @ducanh2912/next-pwa |
| Backend | Supabase (Auth + PostgreSQL) |
| Encryption | @noble/ciphers + @noble/hashes + @scure/bip39 |

## Privacy architecture

The server stores:
- `profiles`: PBKDF2 salt, AES-KW wrapped master key, preferences
- `cycles`: random UUID + encrypted blob (AES-256-GCM)
- `daily_logs`: random UUID + encrypted blob

The server never sees: period dates, phases, flow, symptoms, mood, notes, or any health content.

## Dev setup

```bash
npm install
npm run dev          # localhost:3000
npm run test         # Vitest
npm run build        # production build (must be zero errors)
```

Requires a Supabase project. Copy `.env.local.example` → `.env.local` and fill in your URL and anon key.

```bash
supabase start       # local Supabase (Docker required)
supabase db push     # apply migrations
```

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL= #ANON
NEXT_PUBLIC_SUPABASE_ANON_KEY= #ANON
SUPABASE_SERVICE_ROLE_KEY= #ANON
NEXT_PUBLIC_VAPID_PUBLIC_KEY= #ANON
VAPID_PRIVATE_KEY= #ANON
```
