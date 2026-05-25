@AGENTS.md

# Lune

Period tracking PWA. Next.js 16 App Router + TypeScript + Tailwind CSS v4 + Supabase + client-side E2EE.
Target: iPhone + iPad PWA (iOS 16.4+). ~2 users. Deployed on Vercel.

## Stack
- Framework: Next.js 16 (App Router), React 19
- Styling: Tailwind CSS v4 (CSS-first config via `@import "tailwindcss"` in globals.css — no tailwind.config.js)
- Animations: Framer Motion
- PWA: @ducanh2912/next-pwa (service worker + workbox)
- Backend: Supabase (Auth + PostgreSQL + Edge Functions)
- Encryption: @noble/ciphers + @noble/hashes + @scure/bip39 (WebCrypto, runs in browser only)
- Testing: Vitest (Node env — Node 21 has globalThis.crypto.subtle natively)

## Critical Invariants — Never Break These
1. ZERO plaintext health data in Supabase. Period dates, phases, symptoms, mood, flow, notes — ALL encrypted client-side before any DB write.
2. `encryptJSON()` / `decryptJSON()` in `src/lib/encryption/core.ts` are the ONLY path between health data and Supabase. Never bypass these functions.
3. Master key lives in `useRef` inside `EncryptionProvider`. Never in React state, localStorage, sessionStorage, or cookies.
4. Test encrypt → store → fetch → decrypt round-trip before marking any data feature complete.
5. HTML mockup (`design/mockups/`) before production UI component for any visual design decision.
6. All Supabase tables have RLS enabled. Policy: `auth.uid() = user_id` (or `= id` for profiles) on every row.
7. No plaintext period dates or log dates in DB columns. All health dates live inside encrypted blobs only.

## Dev Commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run test         # Vitest watch mode
npm run test:run     # Vitest single run (CI)
npm run build        # Production build (must pass with zero errors)
supabase start       # Local Supabase (requires Docker)
supabase db push     # Apply migrations to local DB
supabase studio      # Open DB inspector (localhost:54323)
```

## Key File Locations
```
src/lib/encryption/core.ts        — All WebCrypto operations (encrypt/decrypt/wrap/derive)
src/lib/encryption/setup.ts       — First-time key generation + BIP39 recovery phrase
src/lib/encryption/context.tsx    — React EncryptionProvider (master key in useRef)
src/lib/algorithm/prediction.ts   — Phase prediction engine (all client-side)
src/lib/supabase/client.ts        — Browser Supabase client singleton
src/lib/supabase/server.ts        — Server Component Supabase client
supabase/migrations/              — All schema DDL + RLS
design/mockups/                   — HTML design mockups (committed, disposable)
docs/PLAN.md                      — Full implementation plan
docs/ARCHITECTURE.md              — E2EE architecture reference
```

## Database Schema (What Supabase Stores)
- `profiles`: id, key_salt, wrapped_key, recovery_wrapped_key, pbkdf2_iterations, reminder prefs
- `cycles`: id, user_id, enc_data (encrypted JSON blob), enc_data_iv, created_at
- `daily_logs`: id, user_id, enc_data (encrypted JSON blob), enc_data_iv, created_at
- `push_subscriptions`: id, user_id, subscription (JSONB), device_name, created_at

NO plaintext period dates. NO plaintext log dates. Server sees only encrypted blobs.

## Model Guidance
- Use **Sonnet 4.6** for all standard coding (components, hooks, routing, Supabase integration)
- Switch to **Opus 4.7** (`/model`) for: encryption module changes, algorithm edge cases, architecture decisions
- Rationale: Silent encryption bugs are catastrophic. One correct Opus session < multiple Sonnet debugging rounds.

## iOS PWA Requirements
- `display: standalone` in manifest (not fullscreen — iOS ignores it)
- `viewport-fit: cover` + `env(safe-area-inset-*)` CSS for Dynamic Island / notch
- `maximum-scale=1, user-scalable=no` in viewport to prevent input field zoom
- `apple-mobile-web-app-capable` meta tag required
- Splash screen PNGs for each device resolution
- Web Push requires iOS 16.4+ AND app added to home screen
