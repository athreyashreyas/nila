-- ============================================================
-- REALTIME
-- Adds cycles and daily_logs to the realtime publication so every signed-in
-- device gets pushed a change notification the instant another device writes
-- a row, instead of waiting for a manual refresh or app foreground.
-- RLS still applies: a client only receives change events for rows it could
-- SELECT, and the payload is the same opaque enc_data blob already exposed
-- over REST, so no plaintext health data is newly exposed.
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.cycles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_logs;
