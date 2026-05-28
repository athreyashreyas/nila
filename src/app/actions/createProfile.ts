'use server';

import { createClient } from '@supabase/supabase-js';

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

  if (!url || !serviceKey) {
    return { error: `Server misconfiguration: missing env vars (URL=${!!url} KEY=${!!serviceKey})` };
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
