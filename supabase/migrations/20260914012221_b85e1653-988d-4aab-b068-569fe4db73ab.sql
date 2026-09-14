ALTER TABLE public.publishing_jobs
  ADD COLUMN IF NOT EXISTS remote_id TEXT,
  ADD COLUMN IF NOT EXISTS remote_url TEXT;