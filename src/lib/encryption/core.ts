'use client';

// ─── Base64url helpers ────────────────────────────────────────────────────────

function toBase64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function fromBase64url(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

// ─── Salt ─────────────────────────────────────────────────────────────────────

export function generateSalt(): string {
  return toBase64url(crypto.getRandomValues(new Uint8Array(32)));
}

// ─── Password key derivation (PBKDF2-SHA512) ──────────────────────────────────

export async function derivePasswordKey(
  password: string,
  saltB64: string,
  iterations: number
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-512', salt: fromBase64url(saltB64), iterations },
    keyMaterial,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

// ─── Recovery key derivation (BIP39 seed → AES-KW) ───────────────────────────

export async function deriveRecoveryKey(phrase: string): Promise<CryptoKey> {
  const { mnemonicToSeed } = await import('@scure/bip39');
  const seed = await mnemonicToSeed(phrase);
  return crypto.subtle.importKey(
    'raw',
    seed.slice(0, 32),
    { name: 'AES-KW' },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

// ─── Master key ───────────────────────────────────────────────────────────────

export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function wrapMasterKey(
  masterKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey('raw', masterKey, wrappingKey, {
    name: 'AES-KW',
  });
  return toBase64url(wrapped);
}

export async function unwrapMasterKey(
  wrappedB64: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    fromBase64url(wrappedB64),
    wrappingKey,
    { name: 'AES-KW' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── Data encryption (AES-256-GCM) ───────────────────────────────────────────

export async function encryptJSON<T>(
  data: T,
  masterKey: CryptoKey
): Promise<{ enc_data: string; enc_data_iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    new TextEncoder().encode(JSON.stringify(data))
  );
  return {
    enc_data: toBase64url(ciphertext),
    enc_data_iv: toBase64url(iv),
  };
}

export async function decryptJSON<T>(
  encData: string,
  encIv: string,
  masterKey: CryptoKey
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64url(encIv) },
    masterKey,
    fromBase64url(encData)
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
