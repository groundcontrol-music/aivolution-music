-- ============================================================
-- FIX: Banner/Header-Upload (RLS) + Impressum-Tabelle + SVG
-- Im Supabase SQL Editor ausführen.
-- ============================================================

-- 1) AVATARS BUCKET: Upload nur in eigenem Ordner (name = "creator_id/...")
--    So funktionieren Banner + Avatar + Thumbnails ohne RLS-Fehler.
DROP POLICY IF EXISTS "Auth Upload Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Auth Upload Avatars" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Auth Update Avatars" ON storage.objects;
CREATE POLICY "Auth Update Avatars" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Auth Delete Avatars" ON storage.objects;
CREATE POLICY "Auth Delete Avatars" ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2) PROFILES: Sicherstellen, dass User eigenes Profil updaten darf (Banner, social_links, bio)
--    Falls die Policy schon existiert, überspringen wir mit DO.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- 3) CREATOR IMPRESSUM ASSETS (Bild-Zuordnung; wird von der Impressum-Bild-API gelesen)
CREATE TABLE IF NOT EXISTS public.creator_impressum_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/webp',
  is_active BOOLEAN NOT NULL DEFAULT true,
  protection_level TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT creator_impressum_assets_creator_unique UNIQUE (creator_id)
);
ALTER TABLE public.creator_impressum_assets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at_creator_impressum_assets()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_creator_impressum_assets_updated_at ON public.creator_impressum_assets;
CREATE TRIGGER trg_creator_impressum_assets_updated_at
  BEFORE UPDATE ON public.creator_impressum_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_creator_impressum_assets();

DROP POLICY IF EXISTS "Owner can read own impressum asset" ON public.creator_impressum_assets;
CREATE POLICY "Owner can read own impressum asset" ON public.creator_impressum_assets FOR SELECT USING (creator_id = auth.uid());
DROP POLICY IF EXISTS "Owner can upsert own impressum asset" ON public.creator_impressum_assets;
CREATE POLICY "Owner can upsert own impressum asset" ON public.creator_impressum_assets FOR INSERT WITH CHECK (creator_id = auth.uid());
DROP POLICY IF EXISTS "Owner can update own impressum asset" ON public.creator_impressum_assets;
CREATE POLICY "Owner can update own impressum asset" ON public.creator_impressum_assets FOR UPDATE USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
DROP POLICY IF EXISTS "Owner can delete own impressum asset" ON public.creator_impressum_assets;
CREATE POLICY "Owner can delete own impressum asset" ON public.creator_impressum_assets FOR DELETE USING (creator_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage all impressum assets" ON public.creator_impressum_assets;
CREATE POLICY "Admins can manage all impressum assets" ON public.creator_impressum_assets FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- Public/anon darf lesen (für Impressum-Seite; alternativ liefert eure API mit Service-Role aus)
DROP POLICY IF EXISTS "Public can read active impressum asset" ON public.creator_impressum_assets;
CREATE POLICY "Public can read active impressum asset" ON public.creator_impressum_assets FOR SELECT USING (is_active = true);

-- 4) CREATOR IMPRESSUM DETAILS (Daten für Formular)
CREATE TABLE IF NOT EXISTS public.creator_impressum_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  legal_name TEXT NOT NULL,
  street TEXT NOT NULL,
  zip_city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Deutschland',
  email TEXT,
  phone TEXT,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_impressum_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read own impressum details" ON public.creator_impressum_details;
CREATE POLICY "Owner can read own impressum details" ON public.creator_impressum_details FOR SELECT USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Owner can upsert own impressum details" ON public.creator_impressum_details;
CREATE POLICY "Owner can upsert own impressum details" ON public.creator_impressum_details FOR INSERT WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Owner can update own impressum details" ON public.creator_impressum_details;
CREATE POLICY "Owner can update own impressum details" ON public.creator_impressum_details FOR UPDATE USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all impressum details" ON public.creator_impressum_details;
CREATE POLICY "Admins can manage all impressum details" ON public.creator_impressum_details FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- Trigger für updated_at (Funktion ggf. aus supabase_creator_impressum.sql)
CREATE OR REPLACE FUNCTION public.set_updated_at_creator_impressum_details()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_creator_impressum_details_updated_at ON public.creator_impressum_details;
CREATE TRIGGER trg_creator_impressum_details_updated_at
  BEFORE UPDATE ON public.creator_impressum_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_creator_impressum_details();

-- 4) CREATOR-IMPRESSUM BUCKET: SVG erlauben (für generiertes Impressum-Bild)
UPDATE storage.buckets
SET
  public = true,
  allowed_mime_types = COALESCE(
    (SELECT array_agg(DISTINCT unnest) FROM unnest(COALESCE(allowed_mime_types, ARRAY['image/webp']) || ARRAY['image/svg+xml'])),
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  )
WHERE id = 'creator-impressum';

-- Falls der Bucket noch nicht existiert, anlegen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-impressum',
  'creator-impressum',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- 6) Storage Policy: Creator darf Impressum-Bild in eigenem Ordner hochladen
DROP POLICY IF EXISTS "Creator can upload own impressum image" ON storage.objects;
CREATE POLICY "Creator can upload own impressum image" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'creator-impressum'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "Creator can update own impressum image" ON storage.objects;
CREATE POLICY "Creator can update own impressum image" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'creator-impressum'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Schema-Cache neu laden (wichtig nach neuer Tabelle)
NOTIFY pgrst, 'reload schema';

SELECT 'Banner/Impressum-Fix ausgeführt. Bitte Creator-Profil und Impressum erneut testen.' AS status;
