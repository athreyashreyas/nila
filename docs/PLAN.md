# Nila — Period Tracking PWA: Master Plan

## Context
Nila is a privacy-first menstrual cycle tracking PWA for iPhone and iPad. ~1-2 users. Goals: accurate 4-phase prediction, true zero-knowledge E2EE (server sees NO health data including dates), empathetic journal-first UI, fast iteration, zero-cost MVP. Built with Next.js 14 + Supabase. Plan committed to repo so it survives branch wipes or full rebuilds.

---

## Execution: Two Phases

### Phase 1 — Full Build (one extended session)
Everything from scaffold to a locally-testable app on your iPhone. Sequential steps, no waiting for separate sessions.

### Phase 2 — Deploy & Personal Test
Get it live on Vercel + Supabase production. Test personally on iPhone/iPad before any rollout.

---

## Model Usage

| Task | Model | Why |
|---|---|---|
| Encryption module (`core.ts`, `setup.ts`, `context.tsx`) | **Opus 4.7** | Silent encryption bugs are catastrophic and hard to debug. One correct Opus session << three Sonnet debugging rounds. |
| Everything else | **Sonnet 4.6** | Fast, accurate for TypeScript/Next.js/React. Correct 95%+ of the time for standard patterns. |

Switch with `/model` before the encryption step, switch back after.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| PWA | @ducanh2912/next-pwa |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| Encryption | @noble/ciphers + @noble/hashes + bip39 |
| Testing | Vitest |
| Deployment | Vercel (free) + Supabase cloud (free) |

---

## Privacy Architecture — Zero Server-Side Health Data

**What Supabase stores (all non-health):**
- `auth.users`: email + auth tokens (Supabase built-in)
- `profiles`: encryption key material (encrypted blobs, useless without password)
- `cycles`: random UUID, user_id, encrypted blob, `created_at`
- `daily_logs`: random UUID, user_id, encrypted blob, `created_at`

**What Supabase never stores:** Period dates, phase states, flow intensity, symptoms, mood, notes, any health content.

**`created_at` note:** Since health dates are encrypted in the payload, `created_at` only reveals "user created a record at this timestamp" — equivalent to app usage metadata, not health information. Kept as-is. The encrypted blob content (including the actual health date) is invisible to the server.

### Key Hierarchy

```
Password → PBKDF2-SHA512 (600k iterations + salt) → PDK
PDK → AES-256-KW unwrap → Master Key (in memory only, never stored)
Master Key + random 12-byte IV → AES-256-GCM → encrypted health blob

BIP39 12-word phrase → seed[:32] → Recovery Key
Recovery Key → AES-256-KW unwrap → Master Key (same master key, backup path)
```

**Multi-device:** Same password → same PDK → unwrap same wrapped master key → same data. Works on iPhone and iPad with zero extra steps.

**Password change:** Re-wrap master key only. No data re-encryption. 1 DB write.

**Forgot password + have 12 words:** Recovery flow. Derive recovery key → unwrap master key → set new password → re-wrap.

**Forgot both:** Data permanently unrecoverable. Communicated warmly at signup as a privacy feature, not a warning.

---

## Database Schema

```sql
-- profiles: key material + preferences
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key_salt              TEXT NOT NULL,          -- 32-byte PBKDF2 salt (base64url, public)
  wrapped_key           TEXT NOT NULL,          -- AES-KW(master_key, PDK)
  recovery_wrapped_key  TEXT,                   -- AES-KW(master_key, recovery_key), set at signup
  pbkdf2_iterations     INTEGER NOT NULL DEFAULT 600000,
  reminder_enabled      BOOLEAN NOT NULL DEFAULT false,
  reminder_hour         SMALLINT CHECK (reminder_hour BETWEEN 0 AND 23),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- cycles: one per menstrual cycle. NO plaintext health dates.
CREATE TABLE public.cycles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enc_data     TEXT NOT NULL,  -- encrypted JSON: { periodStart, periodEnd, flowIntensity, notes }
  enc_data_iv  TEXT NOT NULL,  -- AES-GCM IV (base64url)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- daily_logs: one per journal entry. NO plaintext log_date.
CREATE TABLE public.daily_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enc_data     TEXT NOT NULL,  -- encrypted JSON: { date, mood, energy, symptoms[], notes, flow }
  enc_data_iv  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- push_subscriptions: Web Push endpoints (non-sensitive)
CREATE TABLE public.push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription  JSONB NOT NULL,  -- { endpoint, keys: { p256dh, auth } }
  device_name   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: owner-only on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON public.profiles           USING (auth.uid() = id)      WITH CHECK (auth.uid() = id);
CREATE POLICY "owner" ON public.cycles             USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner" ON public.daily_logs         USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner" ON public.push_subscriptions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION handle_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER trg BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

---

## Phase Prediction Algorithm

**Inputs:** Decrypted cycle records `{ periodStart, periodEnd }` + today's date (all client-side).
**Approach:** Recency-weighted moving average for cycle length. Luteal phase fixed at 14 days.

```
avgCycleLength = weighted_mean(cycle_lengths, weights=[1,2,...,n])
nextPeriodDate = lastPeriodStart + avgCycleLength
ovulationWindow = [nextPeriodDate - 16, nextPeriodDate - 12]  // 5-day window

Phase boundaries (relative to lastPeriodStart):
  period:      day 0 → avgPeriodLength
  follicular:  avgPeriodLength → ovulationDay - 2
  ovulation:   ovulationDay - 2 → ovulationDay + 2
  luteal:      ovulationDay + 2 → nextPeriodDate

Confidence: low (<2 cycles), medium (2-3), high (4+)
Confidence range: ±stdDev days around nextPeriodDate (min ±1, max ±7)
```

---

## UI/UX Design Workflow (In-Session Rule)

During the build session, any visual design decision gets an **interactive HTML mockup** created first:
- Standalone HTML file with sliders/toggles for palette, type, spacing, layout variants
- Saved in `/design/mockups/[decision-name].html` and committed to repo
- User confirms preference in-session, then the component is built
- Each file is unique to its decision

**First mockup (home/journal screen):** Phase indicator ring, today's check-in, mood/symptom quick-log, color palette variants (warm mauve, deep indigo, soft sage, earthy terracotta), light + dark mode. This anchors all subsequent color/type decisions.

**App aesthetic:** Nila (Tamil for moon). Warm, tactile, non-clinical. Tamil-inspired minimalism. Subtly lunar — no aggressive red or stark medical feel.

---

## Push Notifications (MVP)

Requires iOS 16.4+ + app added to home screen. Delivered via Supabase Edge Function + VAPID.

| Trigger | Message |
|---|---|
| 2 days before predicted period | "Your period may be arriving soon — how are you feeling?" |
| 3 days past predicted start | "Your cycle seems a little late — that's completely normal." |
| Daily reminder (user sets time) | "Time for your daily check-in." (off by default) |

---

## Phase 1 Build Order (One Session)

Steps are sequential. Each step must pass its check before moving forward.

### Step 1 — Scaffold + Config (Sonnet)
```bash
cd ~/Desktop/Projects
npx create-next-app@latest lune --typescript --tailwind --app --src-dir --import-alias "@/*"
cd lune
git init && git add . && git commit -m "chore: initial Next.js scaffold"
```
Install deps:
```bash
npm install @supabase/supabase-js @supabase/ssr @ducanh2912/next-pwa framer-motion \
  @noble/ciphers @noble/hashes bip39 dexie vitest @vitest/ui
```
Create `CLAUDE.md` and `docs/PLAN.md` → commit immediately.

**Check:** `npm run dev` → localhost:3000 shows Next.js app.

### Step 2 — PWA Configuration (Sonnet)
- `next.config.js`: @ducanh2912/next-pwa + CSP security headers
- `public/manifest.json`: `display:standalone`, `orientation:any`, icons, theme colors
- `app/layout.tsx`: viewport meta (device-width, maxScale=1, viewportFit=cover), apple-touch-icon links, splash screens
- Generate placeholder icons (192px, 512px maskable, 180px apple-touch-icon)
- Splash screen PNGs for iPhone 14 Pro + iPad Pro 12.9 (portrait + landscape)

**Check:** Safari on iPhone → Add to Home Screen → app opens in standalone mode, no address bar, status bar blends.

### Step 3 — Supabase Local Setup (Sonnet)
```bash
npm install -g supabase
supabase init
supabase start
```
Create `supabase/migrations/001_initial_schema.sql` with schema above → `supabase db push`.

**Check:** `supabase studio` → all 4 tables exist with RLS enabled.

### Step 4 — Encryption Module (⚡ Switch to Opus 4.7)
Build in order, test each before next:
1. `src/lib/encryption/core.ts` — WebCrypto: `generateSalt`, `derivePasswordKey`, `generateMasterKey`, `wrapMasterKey`, `unwrapMasterKey`, `encryptJSON`, `decryptJSON`
2. `src/lib/encryption/setup.ts` — `setupEncryption()`: generates master key + BIP39 recovery phrase, returns `ProfileKeyData` + `recoveryPhrase` + `keys`
3. `src/lib/encryption/context.tsx` — React `EncryptionProvider`, master key in `useRef` (not state, keeps it out of React DevTools)
4. `src/lib/encryption/core.test.ts` — Vitest unit tests:
   - encrypt → decrypt round-trip with known plaintext
   - wrong password fails to unwrap (throws)
   - recovery phrase path: phrase → unwrap → decrypt same data
   - password change: re-wrap → unwrap with new password → decrypt same data
   - different salt → different PDK (no cross-contamination)

```bash
npm run test  # all 5 tests green
```

**Switch back to Sonnet 4.6 after this step.**

**Check:** All tests green. Manually verify in browser console that master key doesn't appear in React DevTools components tree.

### Step 5 — Supabase Client + Auth Scaffolding (Sonnet)
- `src/lib/supabase/client.ts` — `createBrowserClient()` singleton
- `src/lib/supabase/server.ts` — `createServerClient()` for Server Components
- `src/lib/supabase/types.ts` — database type definitions
- Supabase auth middleware (`middleware.ts`) — session refresh on every request
- Route groups: `(auth)` (no nav) and `(app)` (with nav + auth guard)

**Check:** Unauthenticated visit to `/home` redirects to `/login`.

### Step 6 — Auth Flows (Sonnet)
1. **Signup** (`/signup`):
   - Email + password input
   - Call `setupEncryption(password)` → get `{ profileKeyData, recoveryPhrase, keys }`
   - Create Supabase auth user
   - Save `profileKeyData` to `profiles` table
   - Show recovery phrase (12 words, styled card) with "I have written this down" checkbox
   - On confirm → navigate to home
2. **Login** (`/login`):
   - Email + password input
   - Fetch `profiles.key_salt`, `profiles.wrapped_key`, `profiles.pbkdf2_iterations`
   - Derive PDK: `derivePasswordKey(password, key_salt, iterations)`
   - Unwrap: `unwrapMasterKey(wrapped_key, PDK)` → mount to `EncryptionProvider`
   - Navigate to home
3. **Recovery** (`/recover`):
   - Email input (to fetch their key material)
   - 12-word grid input
   - `deriveRecoveryKey(phrase)` → `unwrapMasterKey(recovery_wrapped_key, recoveryKey)`
   - Set new password → re-wrap master key → update `profiles.wrapped_key`

**Check:** Sign up → log out → log in → master key is available in EncryptionProvider context. Test on two different browsers simultaneously (simulates iPhone + iPad).

### Step 7 — Data Layer Hooks (Sonnet)
- `src/hooks/useCycles.ts`:
  - `fetchAll()`: select all cycles for user → decrypt each `enc_data` → sort by `periodStart` descending client-side
  - `addCycle(data)`: `encryptJSON(data)` → insert to Supabase
  - `updateCycle(id, data)`: `encryptJSON(data)` → update
  - `deleteCycle(id)`: delete
- `src/hooks/useDailyLog.ts`:
  - `fetchAll()`: select all daily_logs → decrypt → sort by `date`
  - `getByDate(date)`: fetchAll → find match
  - `upsertLog(data)`: encrypt → insert or update (delete old by date, insert new)
- `src/hooks/usePrediction.ts`:
  - Calls `useCycles`, passes decrypted records to `predictCycle()` from algorithm module
  - Returns `PredictionResult` or null if no cycles logged yet

**Check:** Add a test cycle via browser console using the hook → check Supabase Studio confirms only encrypted blob is stored → decrypt in console and verify plaintext matches.

### Step 8 — Algorithm (Sonnet)
- `src/lib/algorithm/prediction.ts` — `predictCycle()` full implementation
- `src/lib/algorithm/prediction.test.ts`:
  - Regular cycles (28-day) → verify correct phase on specific days
  - Irregular cycles → verify weighted average pulls toward recent
  - First-ever log → returns low confidence, falls back to 28-day default
  - Retroactive logging (log on day 20 for cycle that started day 1)
  - Cycle straddling month boundary

**Check:** All algorithm tests green. `npm run test`.

### Step 9 — UI Build (Sonnet, with inline HTML mockups)

**Mockup first, component second — every time.**

#### 9a. Design session: Home + color palette
Create `design/mockups/01-home-journal.html` with:
- Sliders: hue, saturation, corner radius, font weight
- Variants: warm mauve / deep indigo / soft sage / earthy terracotta
- Light + dark mode toggle
- Phase ring (SVG) + today's mood quick-log

User picks combination → document preference → build component.

#### 9b. Component build order:
1. `BottomNav` — 4 tabs: Today / Calendar / Insights / Settings. iOS-style, safe-area aware.
2. `PhaseRing` — SVG ring showing position in cycle. Phase color, day number in center.
3. `PhaseCard` — Current phase name, day X of phase, 1-line description of what to expect.
4. **Home page** (`/home`) — PhaseCard at top, below it: quick mood + flow tap buttons, recent journal preview.
5. **DailyLogForm** — mood picker (5 states, emoji-adjacent), symptom chips (multi-select), flow picker (none/spotting/light/medium/heavy), notes textarea. Encrypts on save.
6. **Journal page** (`/journal/[date]`) — Full DailyLogForm for that date.
7. **CycleCalendar** — Month view, phase background shading per day band, period marker dots, tap day → open journal entry. Client-side rendering only (needs decrypted data).
8. **Calendar page** (`/calendar`).
9. **CycleLengthChart** — Simple SVG line chart of cycle lengths over time. No library needed for MVP.
10. **Insights page** (`/insights`).
11. **Settings page** — Reminder toggle + hour picker, change password, view/copy recovery phrase, export data (JSON download of encrypted + plaintext date data).

### Step 10 — Push Notifications (Sonnet)
- `src/lib/push/register.ts` — `navigator.serviceWorker.ready` → `pushManager.subscribe()` → save to `push_subscriptions`
- VAPID key generation: `npx web-push generate-vapid-keys`
- Supabase Edge Function (`supabase/functions/send-push/index.ts`):
  - Receives `{ userId, message }` 
  - Fetches push subscriptions for user
  - Sends Web Push via `web-push` library with VAPID keys
- Settings page: enable daily reminder → register push → save subscription
- Prediction layer: schedule push at predicted period - 2 days (triggered via cron or Supabase scheduled function)

**Check:** Add app to iPhone home screen → enable reminders in settings → receive test push notification.

### Step 11 — Final Local Verification
```bash
npm run build  # zero type errors, zero build warnings
npm run test   # all tests green
```
Manual checks:
- [ ] Signup flow works, recovery phrase shown
- [ ] Login + key derivation works (test on mobile browser)
- [ ] Add cycle + daily log → Supabase Studio shows only encrypted blobs
- [ ] Log out and log back in → data still decrypts correctly
- [ ] iOS: Add to Home Screen → opens standalone, portrait + landscape both work
- [ ] iPad: landscape layout renders correctly
- [ ] Push notification arrives after enabling reminder

Commit everything: `git add . && git commit -m "feat: complete MVP build"`

---

## Phase 2 — Deploy & Personal Test (One Session)

### Step 1 — Supabase Production
1. Create new Supabase project at supabase.com (free tier)
2. Run migration: `supabase db push --db-url <production-url>`
3. Enable Supabase Auth email provider
4. Copy `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Step 2 — VAPID Keys for Production
```bash
npx web-push generate-vapid-keys  # save to password manager, add to Vercel env
```

### Step 3 — Vercel Deploy
1. Push repo to GitHub (private repo)
2. Import to Vercel → set environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   ```
3. Deploy → Vercel provides HTTPS URL (required for PWA + Web Push)

### Step 4 — Deploy Supabase Edge Functions
```bash
supabase functions deploy send-push --project-ref <ref>
```

### Step 5 — Personal Device Test
iPhone steps:
1. Open Vercel URL in Safari
2. Sign up with your email
3. Write down the 12 recovery words
4. Log a cycle and a daily entry
5. Open Supabase Studio → verify encrypted blobs only
6. Log out → log back in → verify data decrypts
7. Add to Home Screen → verify standalone mode
8. Enable daily reminder → verify push arrives
9. Open on iPad → verify landscape layout

### Step 6 — Custom Domain (Optional, ~$12/year)
Point `lune.yourdomain.com` to Vercel. Required if sharing with a second user.

---

## Files Committed to Repo (Survives Branch Wipes)

```
CLAUDE.md           — project invariants, stack, dev commands, E2EE rules
docs/PLAN.md        — this full plan (copy of master plan, committed on Step 1)
docs/ARCHITECTURE.md — E2EE key hierarchy diagram + tradeoff table
design/mockups/     — HTML design decisions (committed, useful history)
```

If the MVP branch is scrapped, these files in git history give you the full context to rebuild without re-planning.

---

## CLAUDE.md (Created in Step 1, Never Overridden)

```markdown
# Nila

Period tracking PWA. Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase + client-side E2EE.
Target: iPhone + iPad PWA (iOS 16.4+). ~2 users. Deployed on Vercel.

## Stack
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS + Framer Motion
- PWA: @ducanh2912/next-pwa
- Backend: Supabase (Auth + PostgreSQL + Edge Functions)
- Encryption: @noble/ciphers + @noble/hashes + bip39 (WebCrypto, runs in browser)
- Testing: Vitest

## Invariants — Never Break These
1. Zero plaintext health data in Supabase. Period dates, phases, symptoms, mood, flow — all encrypted client-side before any DB write.
2. encryptJSON() / decryptJSON() are the ONLY path between health data and Supabase. Never bypass.
3. Master key lives in useRef inside EncryptionProvider. Never in state, localStorage, or sessionStorage.
4. Test encrypt → store → fetch → decrypt round-trip before marking any data feature complete.
5. HTML mockup before production UI component for any visual design decision.
6. All tables have RLS enabled. auth.uid() = user_id on every policy.

## Dev Commands
npm run dev          # Start dev server (localhost:3000)
npm run test         # Vitest unit tests
npm run build        # Production build (must be zero errors)
supabase start       # Local Supabase (Docker required)
supabase db push     # Apply migrations to local DB
supabase studio      # Open DB inspector (localhost:54323)

## Key Files
src/lib/encryption/core.ts       — All WebCrypto operations
src/lib/encryption/setup.ts      — First-time key generation
src/lib/encryption/context.tsx   — React EncryptionProvider
src/lib/algorithm/prediction.ts  — Phase prediction engine
src/lib/supabase/client.ts       — Browser Supabase client
src/lib/supabase/server.ts       — Server Component client
supabase/migrations/             — All schema DDL

## Model Guidance
Use Sonnet 4.6 for all standard coding.
Switch to Opus 4.7 (/model) for: encryption module changes, algorithm edge cases, any architectural decision.
```

---

## Start Command

```bash
mkdir -p ~/Desktop/Projects
cd ~/Desktop/Projects
npx create-next-app@latest lune --typescript --tailwind --app --src-dir --import-alias "@/*"
cd lune && git init
```

Everything builds from there. Phase 1 is one session. Phase 2 is one session.
