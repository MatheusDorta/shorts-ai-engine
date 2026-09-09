CREATE POLICY "media read own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media insert own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media update own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);