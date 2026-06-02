# Nila

A privacy-first menstrual cycle tracking PWA for iPhone and iPad. All health data is encrypted client-side — the server stores only encrypted blobs and never sees period dates, symptoms, mood, or any health content.

## Features

- **4-phase cycle tracking** — period, follicular, ovulation, luteal with confidence-weighted prediction
- **Daily log** — mood, energy, flow, symptoms, freeform notes
- **Hormone graph** — interactive oestrogen/progesterone/LH visualisation, scrub by day
- **Calendar** — month view with phase shading and per-day log sheet
- **Insights** — phase-aware food, movement, and sleep recommendations (veg/non-veg toggle)
- **Zero-knowledge E2EE** — master key derived from password via PBKDF2 (600k iterations), never leaves the device
- **12-word recovery phrase** — BIP39 seed for account recovery without password
- **Cross-device sync** — same password unlocks same data on iPhone and iPad
- **Pull-to-refresh** — drag down to sync across devices
- **Dark/light/system theme** — persists across devices via Supabase preferences
- **PWA** — installable, works offline, no App Store required

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + Framer Motion |
| PWA | @ducanh2912/next-pwa |
| Backend | Supabase (Auth + PostgreSQL) |
| Encryption | @noble/ciphers + @noble/hashes + @scure/bip39 |

## Privacy Architecture

The server stores:
- `profiles` — PBKDF2 salt, AES-KW wrapped master key, preferences
- `cycles` — random UUID + encrypted blob (AES-256-GCM)
- `daily_logs` — random UUID + encrypted blob

The server never sees: period dates, phases, flow, symptoms, mood, notes, or any health content.

## Dev Setup

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

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```
