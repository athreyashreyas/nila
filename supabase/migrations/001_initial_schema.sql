-- ============================================================
-- Lune — Initial Schema
-- Privacy architecture: NO plaintext health data.
-- Period dates, log dates, symptoms, mood, notes — ALL encrypted in enc_data blobs.
-- Server sees only: user IDs, record UUIDs, timestamps, encrypted bytes.
-- ============================================================

-- ============================================================
-- PROFILES
-- Extends auth.users (1:1). Stores E2EE key material.
-- ============================================================
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- E2EE key material (all base64url encoded)
  key_salt              TEXT NOT NULL,          -- 32-byte PBKDF2 salt (public, not secret)
  wrapped_key           TEXT NOT NULL,          -- AES-KW(master_key, PDK) — useless without password
  recovery_wrapped_key  TEXT,                   -- AES-KW(master_key, recovery_key) — useless without phrase
  pbkdf2_iterations     INTEGER NOT NULL DEFAULT 600000,

  -- User preferences (non-sensitive, plaintext OK)
  reminder_enabled      BOOLEAN NOT NULL DEFAULT false,
  reminder_hour         SMALLINT CHECK (reminder_hour BETWEEN 0 AND 23),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CYCLES
-- One row per menstrual cycle.
-- enc_data shape (decrypted): { periodStart: string, periodEnd: string | null, flowIntensity: string, notes: string }
-- periodStart/periodEnd are ISO date strings stored ONLY inside the encrypted blob.
-- ============================================================
CREATE TABLE public.cycles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enc_data     TEXT NOT NULL,   -- AES-256-GCM encrypted JSON blob (base64url)
  enc_data_iv  TEXT NOT NULL,   -- 12-byte IV for enc_data (base64url)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DAILY_LOGS
-- One row per journal entry.
-- enc_data shape (decrypted): { date: string, mood: string, energy: number, symptoms: string[], notes: string, flow: string }
-- date is an ISO date string stored ONLY inside the encrypted blob.
-- ============================================================
CREATE TABLE public.daily_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enc_data     TEXT NOT NULL,   -- AES-256-GCM encrypted JSON blob (base64url)
  enc_data_iv  TEXT NOT NULL,   -- 12-byte IV for enc_data (base64url)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PUSH_SUBSCRIPTIONS
-- Web Push API subscription objects (non-sensitive by design).
-- ============================================================
CREATE TABLE public.push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription  JSONB NOT NULL,   -- { endpoint, keys: { p256dh, auth } }
  device_name   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Every table: only the authenticated owner can read/write their rows.
-- ============================================================
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON public.profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "owner" ON public.cycles
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner" ON public.daily_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner" ON public.push_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Profile is created by the client after key generation (not here),
  -- because we need the client-generated key_salt and wrapped_key.
  -- This trigger is intentionally a no-op; profile INSERT happens from client.
  RETURN NEW;
END;
$$;
