CREATE TYPE public.source_type AS ENUM ('youtube','podcast','live_stream','upload','other');
CREATE TYPE public.permission_status AS ENUM ('confirmed_permission','licensed','own_content','unknown','not_allowed');
CREATE TYPE public.content_status AS ENUM ('draft','processing','ready_for_review','approved','rejected','scheduled','published','failed');
CREATE TYPE public.platform AS ENUM ('youtube_shorts','tiktok');
CREATE TYPE public.publishing_status AS ENUM ('waiting','scheduled','publishing','published','failed');
CREATE TYPE public.approval_action_type AS ENUM ('approved','rejected');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  program TEXT NOT NULL,
  company TEXT,
  url TEXT NOT NULL,
  tracking_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  platform public.platform,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_links TO authenticated;
GRANT ALL ON public.affiliate_links TO service_role;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own affiliate links" ON public.affiliate_links FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX affiliate_links_user_idx ON public.affiliate_links(user_id);
CREATE TRIGGER affiliate_links_updated_at BEFORE UPDATE ON public.affiliate_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  source_type public.source_type NOT NULL DEFAULT 'youtube',
  creator_name TEXT,
  permission_status public.permission_status NOT NULL DEFAULT 'unknown',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sources" ON public.sources FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX sources_user_idx ON public.sources(user_id);
CREATE TRIGGER sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source_id UUID REFERENCES public.sources ON DELETE SET NULL,
  affiliate_link_id UUID REFERENCES public.affiliate_links ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_path TEXT,
  thumbnail_path TEXT,
  duration_seconds INTEGER,
  hook TEXT,
  caption TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  cta TEXT,
  status public.content_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content TO authenticated;
GRANT ALL ON public.content TO service_role;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own content" ON public.content FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX content_user_idx ON public.content(user_id);
CREATE INDEX content_status_idx ON public.content(status);
CREATE INDEX content_source_idx ON public.content(source_id);
CREATE TRIGGER content_updated_at BEFORE UPDATE ON public.content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.content_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content ON DELETE CASCADE,
  platform public.platform NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_platforms TO authenticated;
GRANT ALL ON public.content_platforms TO service_role;
ALTER TABLE public.content_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own content platforms" ON public.content_platforms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX content_platforms_content_idx ON public.content_platforms(content_id);

CREATE TABLE public.approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content ON DELETE CASCADE,
  action public.approval_action_type NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_actions TO authenticated;
GRANT ALL ON public.approval_actions TO service_role;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own approval actions" ON public.approval_actions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX approval_actions_content_idx ON public.approval_actions(content_id);

CREATE TABLE public.publishing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content ON DELETE CASCADE,
  platform public.platform NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status public.publishing_status NOT NULL DEFAULT 'waiting',
  result TEXT,
  error_message TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publishing_jobs TO authenticated;
GRANT ALL ON public.publishing_jobs TO service_role;
ALTER TABLE public.publishing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own publishing jobs" ON public.publishing_jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX publishing_jobs_user_idx ON public.publishing_jobs(user_id);
CREATE INDEX publishing_jobs_content_idx ON public.publishing_jobs(content_id);
CREATE TRIGGER publishing_jobs_updated_at BEFORE UPDATE ON public.publishing_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  platform public.platform NOT NULL,
  account_name TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_accounts TO authenticated;
GRANT ALL ON public.platform_accounts TO service_role;
ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own platform accounts" ON public.platform_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER platform_accounts_updated_at BEFORE UPDATE ON public.platform_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content_id UUID REFERENCES public.content ON DELETE CASCADE,
  platform public.platform NOT NULL,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  follows BIGINT NOT NULL DEFAULT 0,
  link_clicks BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics TO authenticated;
GRANT ALL ON public.analytics TO service_role;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analytics" ON public.analytics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX analytics_user_idx ON public.analytics(user_id);
CREATE INDEX analytics_content_idx ON public.analytics(content_id);
CREATE INDEX analytics_date_idx ON public.analytics(stat_date);
CREATE TRIGGER analytics_updated_at BEFORE UPDATE ON public.analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  event TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_logs TO authenticated;
GRANT ALL ON public.automation_logs TO service_role;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own automation logs" ON public.automation_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX automation_logs_user_idx ON public.automation_logs(user_id);