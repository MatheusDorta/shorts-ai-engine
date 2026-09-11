-- Phase 1 YouTube OAuth: server-only credential storage.
-- Refresh tokens must never be readable by anon or authenticated clients.

CREATE TABLE public.platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  platform public.platform NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  youtube_channel_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

CREATE INDEX platform_credentials_user_idx ON public.platform_credentials(user_id);
CREATE INDEX platform_credentials_channel_idx ON public.platform_credentials(youtube_channel_id);

CREATE TRIGGER platform_credentials_updated_at
  BEFORE UPDATE ON public.platform_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.platform_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.platform_credentials TO service_role;

CREATE POLICY "deny browser access to platform credentials"
  ON public.platform_credentials
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
