-- Phase Y2: store YouTube video id/url on publishing jobs after a real upload.
-- Additive only. Does not change existing RPCs, triggers, RLS, or storage policies.

ALTER TABLE public.publishing_jobs
  ADD COLUMN IF NOT EXISTS remote_id TEXT,
  ADD COLUMN IF NOT EXISTS remote_url TEXT;
