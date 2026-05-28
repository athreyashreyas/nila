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
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    key_salt: keyData.key_salt,
    wrapped_key: keyData.wrapped_key,
    recovery_wrapped_key: keyData.recovery_wrapped_key,
    pbkdf2_iterations: keyData.pbkdf2_iterations,
  });

  if (error) throw new Error(error.message);
}
