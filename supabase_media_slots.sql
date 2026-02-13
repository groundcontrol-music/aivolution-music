-- ============================================================
-- MEDIA SLOTS: Bilder & YouTube für Startseiten-Boxen
-- ============================================================

-- 1. promo_slots erweitern
ALTER TABLE public.promo_slots 
ADD COLUMN IF NOT EXISTS media_type TEXT, -- 'image', 'youtube', 'none'
ADD COLUMN IF NOT EXISTS media_url TEXT, -- URL zu Bild (Supabase Storage)
ADD COLUMN IF NOT EXISTS youtube_id TEXT; -- YouTube Video ID

-- 2. Storage Bucket für Media-Uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policy: Jeder kann lesen
CREATE POLICY IF NOT EXISTS "Public can read media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- 4. Storage Policy: Nur Admins können hochladen
CREATE POLICY IF NOT EXISTS "Admins can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 5. Storage Policy: Nur Admins können löschen
CREATE POLICY IF NOT EXISTS "Admins can delete media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Schema Cache neu laden
NOTIFY pgrst, 'reload schema';
