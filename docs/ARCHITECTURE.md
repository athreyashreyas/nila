# Lune — E2EE Architecture Reference

## Key Hierarchy

```
User Password
    │
    ▼  PBKDF2-SHA512 · 600,000 iterations · per-user random salt (32 bytes)
Password-Derived Key (PDK)         ← derived client-side only, never stored
    │
    ▼  AES-256-KW (RFC 3394 key wrap)
Wrapped Master Key ──────────────────────► Supabase profiles.wrapped_key
    │                                       (40 bytes base64url — useless without password)
    │  unwrap with PDK
    ▼
Master Key (AES-256-GCM, 256-bit)  ← NEVER stored. Lives in React useRef only.
    │
    ▼  AES-256-GCM · random 12-byte IV per write operation
Encrypted health blob ───────────────────► Supabase cycles.enc_data / daily_logs.enc_data

Recovery Phrase (BIP39, 12 words, 128-bit entropy)
    │
    ▼  mnemonicToSeed() → SHA-512 64 bytes → first 32 bytes
Recovery Key                       ← derived from phrase, never stored
    │
    ▼  AES-256-KW
Recovery-Wrapped Master Key ────────────► Supabase profiles.recovery_wrapped_key
```

## What the Server Sees vs. Cannot See

| Server sees | Server cannot see |
|---|---|
| User email (Supabase auth) | Period or log dates |
| Record UUIDs (random) | Any phase information |
| `created_at` timestamps (app usage metadata) | Flow, symptoms, mood, notes |
| `key_salt` (public, needed for key derivation) | The master key |
| `wrapped_key` (encrypted, useless without password) | The password |
| `recovery_wrapped_key` (encrypted, useless without phrase) | Any health content |

`created_at` only reveals "user created a record at this time" — app usage metadata. Since all health dates (period start/end, log date) are encrypted inside the blob, `created_at` reveals nothing about cycle state.

## Key Scenarios

| Scenario | Outcome |
|---|---|
| Login on iPhone | Fetch key_salt + wrapped_key → derive PDK → unwrap master key → mount to EncryptionProvider |
| Login on iPad (same account) | Identical flow. Same password → same PDK → same master key. |
| Password change | Derive new PDK → re-wrap master key → one UPDATE to profiles.wrapped_key. No data re-encryption. |
| Forgot password + have 12 words | Recovery page → derive recovery key → unwrap master key → set new password → re-wrap |
| Forgot both password AND recovery phrase | Data permanently lost. Communicated clearly at signup. |
| Developer inspects DB | Sees random bytes in enc_data columns. No health information readable. |
| Database migration to new host | Move encrypted blobs. Nothing exposed during migration. |

## Cryptographic Parameters

```
PBKDF2:
  hash:       SHA-512
  iterations: 600,000 (OWASP 2023 recommendation for PBKDF2-SHA512)
  saltLength: 32 bytes (random per user, stored in profiles.key_salt)
  keyLength:  256 bits

AES-KW (key wrapping):
  algorithm:  AES-256-KW (RFC 3394)
  output:     40 bytes (32-byte key + 8-byte integrity check)

AES-GCM (data encryption):
  algorithm:  AES-256-GCM
  ivLength:   12 bytes (random per operation)
  tagLength:  128 bits (auto-appended by WebCrypto — do NOT strip or handle manually)

BIP39 Recovery:
  entropy:    128 bits → 12 words
  derivation: mnemonicToSeed(phrase) → 64 bytes → first 32 bytes = recovery key material
```

## Session Key Lifetime

The master key (`CryptoKey` object) lives in a `useRef` inside `EncryptionProvider`:
- Created on: successful login or signup
- Dropped on: tab/app close, explicit lock, or iOS process kill
- On iOS PWA backgrounded + relaunched: EncryptionProvider detects missing key → prompts re-auth
- Never serialized. Never in localStorage. Never in cookies.

## All Data Fetched Client-Side

Because all health dates are encrypted in the blob, the server cannot sort or filter by date. All records for a user are fetched in bulk, decrypted client-side, then sorted in memory. This is practical for 1-2 users (max ~1,500 records ≈ 600KB payload).

## What CANNOT Be Hidden

- That the user has an account (email exists in Supabase auth)
- Timestamps of when records were created (`created_at`)
- How many records exist (count of rows)

These are acceptable residual metadata leaks for a 2-user app with a trusted operator.
