import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  derivePasswordKey,
  generateMasterKey,
  wrapMasterKey,
  unwrapMasterKey,
  encryptJSON,
  decryptJSON,
  deriveRecoveryKey,
} from './core';
import { setupEncryption } from './setup';

// PBKDF2 at 600k iterations is intentionally slow (~2-4s per call in Node).
// Each test has a 30s timeout to accommodate this.
const TIMEOUT = 30_000;

describe('encryption/core', () => {
  it('encrypt → decrypt round-trip with known plaintext', async () => {
    const masterKey = await generateMasterKey();
    const payload = { date: '2025-06-01', mood: 'good', notes: 'feeling great' };
    const { enc_data, enc_data_iv } = await encryptJSON(payload, masterKey);
    const result = await decryptJSON<typeof payload>(enc_data, enc_data_iv, masterKey);
    expect(result).toEqual(payload);
  }, TIMEOUT);

  it('wrong password fails to unwrap', async () => {
    const salt = generateSalt();
    const pdk = await derivePasswordKey('correct', salt, 600_000);
    const masterKey = await generateMasterKey();
    const wrapped = await wrapMasterKey(masterKey, pdk);

    const wrongPdk = await derivePasswordKey('wrong', salt, 600_000);
    await expect(unwrapMasterKey(wrapped, wrongPdk)).rejects.toThrow();
  }, TIMEOUT);

  it('recovery phrase path: phrase → unwrap → decrypt same data', async () => {
    const { profileKeyData, recoveryPhrase, masterKey } = await setupEncryption('my-password');
    const payload = { periodStart: '2025-06-01', periodEnd: '2025-06-05' };
    const { enc_data, enc_data_iv } = await encryptJSON(payload, masterKey);

    const recoveryKey = await deriveRecoveryKey(recoveryPhrase);
    const recoveredKey = await unwrapMasterKey(profileKeyData.recovery_wrapped_key!, recoveryKey);
    const result = await decryptJSON<typeof payload>(enc_data, enc_data_iv, recoveredKey);
    expect(result).toEqual(payload);
  }, TIMEOUT);

  it('password change: re-wrap with new password → decrypt same data', async () => {
    const { masterKey } = await setupEncryption('old-password');
    const payload = { date: '2025-06-01', energy: 4 };
    const { enc_data, enc_data_iv } = await encryptJSON(payload, masterKey);

    // Re-wrap the same master key under a new password
    const newSalt = generateSalt();
    const newPdk = await derivePasswordKey('new-password', newSalt, 600_000);
    const newWrapped = await wrapMasterKey(masterKey, newPdk);

    const restoredKey = await unwrapMasterKey(newWrapped, newPdk);
    const result = await decryptJSON<typeof payload>(enc_data, enc_data_iv, restoredKey);
    expect(result).toEqual(payload);
  }, TIMEOUT);

  it('different salt → different PDK → cannot unwrap', async () => {
    const password = 'same-password';
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    const pdk1 = await derivePasswordKey(password, salt1, 600_000);
    const masterKey = await generateMasterKey();
    const wrapped = await wrapMasterKey(masterKey, pdk1);

    const pdk2 = await derivePasswordKey(password, salt2, 600_000);
    await expect(unwrapMasterKey(wrapped, pdk2)).rejects.toThrow();
  }, TIMEOUT);
});
