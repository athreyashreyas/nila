# Nila — Tech Debt & Deferred TODOs

## Auth & Security
- [ ] **Email confirmation disabled** — Re-enable once custom SMTP is configured (Resend recommended, free 3k/month). Supabase free tier rate-limits to ~5 emails/hour which breaks testing. Supabase → Auth → Providers → Email → "Confirm email".
- [ ] **Custom SMTP** — Set up Resend or SendGrid in Supabase → Auth → SMTP Settings to remove email rate limits and enable email confirmation.

## Features
- [ ] **Log period from home screen** — No flow to log a new cycle start. Needs a prominent "Log period" button on the home page that opens a date picker + flow intensity selector.
- [ ] **Push notification scheduling** — Edge function (`send-push`) is deployed with VAPID keys, but nothing triggers it. Need a Supabase cron job or pg_cron to fire 2 days before predicted period and 3 days after overdue.
- [ ] **Daily reminder time picker** — Settings page has the toggle but no hour picker for the daily check-in reminder.

## UI / Polish
- [ ] **CSS variable tokens in app pages** — Auth pages fixed to use `style={{ color: 'var(--color-*)' }}`. Audit home, calendar, insights, settings pages for any remaining `bg-[--color-*]` Tailwind v4 arbitrary values that may not apply correctly in production.
- [ ] **Splash screens** — iOS splash screen PNGs not generated yet (needed for Add to Home Screen loading state on iPhone/iPad).

## DevOps / CI
- [ ] **CI pipeline** — No automated checks on push. Pre-push tsc hook was too slow for this machine. Set up GitHub Actions to run `tsc --noEmit` + `vitest run` on every push to main, blocking merge if either fails.
- [ ] **Vercel preview deployments** — Currently deploying straight to production on every push. Set up a `dev` branch for staging.
