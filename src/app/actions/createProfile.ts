'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createProfile(
  userId: string,
  keyData: {
    key_salt: string;
    wrapped_key: string;
    recovery_wrapped_key: string | null;
    pbkdf2_iterations: number;
  }
): Promise<{ error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return { error: `Server misconfiguration: missing env vars (URL=${!!url} KEY=${!!serviceKey})` };
  }

  // If the caller already has a session, the profile must be their own. During the
  // normal signup flow (email confirmation pending) there is no session yet, so this
  // legitimately passes through; the service-role insert below is still gated by the
  // profiles PK (no overwrite) and the FK to auth.users (must be a real user).
  if (anonKey) {
    try {
      const cookieStore = await cookies();
      const authed = createServerClient(url, anonKey, {
        cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
      });
      const { data: { user } } = await authed.auth.getUser();
      if (user && user.id !== userId) {
        return { error: 'You can only set up your own profile.' };
      }
    } catch {
      // No readable session; fall through to the gated service-role insert.
    }
  }

  const supabase = createClient(url, serviceKey);

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    key_salt: keyData.key_salt,
    wrapped_key: keyData.wrapped_key,
    recovery_wrapped_key: keyData.recovery_wrapped_key,
    pbkdf2_iterations: keyData.pbkdf2_iterations,
  });

  if (error) {
    console.error('[createProfile] insert failed:', error.code, error.message, error.details);
    return { error: error.message };
  }

  return { error: null };
}
