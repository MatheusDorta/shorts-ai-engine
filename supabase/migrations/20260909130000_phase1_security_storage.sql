-- Phase 1: private media storage and ownership integrity.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media', 'media', false, 524288000,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "media read own" ON storage.objects;
DROP POLICY IF EXISTS "media insert own" ON storage.objects;
DROP POLICY IF EXISTS "media update own" ON storage.objects;
DROP POLICY IF EXISTS "media delete own" ON storage.objects;
CREATE POLICY "media select own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "media insert own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "media update own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (select auth.uid())::text)
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "media delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (select auth.uid())::text);

ALTER TABLE public.content
  ADD CONSTRAINT content_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.assert_child_content_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.content c WHERE c.id = NEW.content_id AND c.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'content must belong to the same user';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.assert_child_content_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER approval_actions_content_owner BEFORE INSERT OR UPDATE ON public.approval_actions
FOR EACH ROW EXECUTE FUNCTION public.assert_child_content_owner();
CREATE TRIGGER publishing_jobs_content_owner BEFORE INSERT OR UPDATE ON public.publishing_jobs
FOR EACH ROW EXECUTE FUNCTION public.assert_child_content_owner();
CREATE TRIGGER analytics_content_owner BEFORE INSERT OR UPDATE ON public.analytics
FOR EACH ROW WHEN (NEW.content_id IS NOT NULL) EXECUTE FUNCTION public.assert_child_content_owner();
