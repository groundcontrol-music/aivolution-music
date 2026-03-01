-- FIX: Avatar Storage Policies für korrekte RLS

-- Lösche alte Policies
DROP POLICY IF EXISTS "Auth Upload Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Avatars" ON storage.objects;

-- Neue Upload Policy: Nur eigene Ordner
CREATE POLICY "Auth Upload Avatars" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Neue Update Policy: Nur eigene Dateien
CREATE POLICY "Auth Update Avatars" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Neue Delete Policy: Nur eigene Dateien
CREATE POLICY "Auth Delete Avatars" ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- FIX: Impressum Bucket SVG Support
DO $$
BEGIN
  -- Stelle sicher, dass creator-impressum Bucket existiert
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'creator-impressum',
    'creator-impressum',
    true,
    3145728, -- 3 MB
    ARRAY['image/svg+xml']
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    public = true,
    file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/svg+xml'];
    
  -- Policies für creator-impressum Bucket
  DROP POLICY IF EXISTS "Creator Upload Impressum" ON storage.objects;
  CREATE POLICY "Creator Upload Impressum" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'creator-impressum'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
  
  DROP POLICY IF EXISTS "Creator Read Impressum" ON storage.objects;
  CREATE POLICY "Creator Read Impressum" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'creator-impressum'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
  
  DROP POLICY IF EXISTS "Public Read Impressum" ON storage.objects;
  CREATE POLICY "Public Read Impressum" ON storage.objects FOR SELECT
  USING (bucket_id = 'creator-impressum');
  
END $$;