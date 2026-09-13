CREATE TABLE IF NOT EXISTS public.platform_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.platform NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  youtube_channel_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

GRANT ALL ON public.platform_credentials TO service_role;

ALTER TABLE public.platform_credentials ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER platform_credentials_updated_at
BEFORE UPDATE ON public.platform_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();