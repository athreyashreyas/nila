-- Add a general-purpose preferences column to profiles.
-- Stores non-sensitive user preferences (theme etc.) so they sync across devices.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';
