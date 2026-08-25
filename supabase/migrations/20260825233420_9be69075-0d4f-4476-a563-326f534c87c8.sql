
CREATE POLICY "media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('avatars','charger-photos'));
CREATE POLICY "media insert own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars','charger-photos') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media update own folder" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('avatars','charger-photos') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media delete own folder" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('avatars','charger-photos') AND (storage.foldername(name))[1] = auth.uid()::text);
