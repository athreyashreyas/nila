'use client';

import { createBrowserClient } from '@supabase/ssr';

// The single browser Supabase client for the whole app. Everything (hooks,
// settings, auth screens, realtime) goes through this so there is exactly one
// client instance per tab, instead of each call site constructing its own.
//
// Intentionally untyped: this project's @supabase/ssr + supabase-js versions do
// not flow the generated `Database` generic correctly (typed `.select`/`.insert`
// resolve to `never`), so a typed client adds friction without real safety. Reads
// are cast to explicit row types at the call site where it matters.
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
