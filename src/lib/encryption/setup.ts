'use client';

import type { ProfileKeyData } from '@/types/app';
import {
  generateSalt,
  derivePasswordKey,
  generateMasterKey,
  wrapMasterKey,
  deriveRecoveryKey,
} from './core';

export interface SetupResult {
  profileKeyData: ProfileKeyData;
  recoveryPhrase: string;
  masterKey: CryptoKey;
}

export async function setupEncryption(password: string): Promise<SetupResult> {
  const iterations = 600_000;
  const salt = generateSalt();
  const pdk = await derivePasswordKey(password, salt, iterations);
  const masterKey = await generateMasterKey();
  const wrappedKey = await wrapMasterKey(masterKey, pdk);

  const { generateMnemonic } = await import('@scure/bip39');
  const { wordlist } = await import('@scure/bip39/wordlists/english.js');
  const recoveryPhrase = generateMnemonic(wordlist, 128); // 128 bits → 12 words

  const recoveryKey = await deriveRecoveryKey(recoveryPhrase);
  const recoveryWrappedKey = await wrapMasterKey(masterKey, recoveryKey);

  return {
    profileKeyData: {
      key_salt: salt,
      wrapped_key: wrappedKey,
      recovery_wrapped_key: recoveryWrappedKey,
      pbkdf2_iterations: iterations,
    },
    recoveryPhrase,
    masterKey,
  };
}
