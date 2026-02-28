-- Creator-Impressum: sicher speichern, kontrolliert ausliefern
-- Ausfuehrung: im Supabase SQL Editor

-- 1) Tabelle fuer Impressum-Asset (ein aktives Bild pro Creator)
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

-- 2) Updated_at Trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_creator_impressum_assets()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_impressum_assets_updated_at ON public.creator_impressum_assets;
CREATE TRIGGER trg_creator_impressum_assets_updated_at
BEFORE UPDATE ON public.creator_impressum_assets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_creator_impressum_assets();

-- 3) RLS Policies (kein Public-Select auf der Tabelle)
DROP POLICY IF EXISTS "Owner can read own impressum asset" ON public.creator_impressum_assets;
CREATE POLICY "Owner can read own impressum asset"
ON public.creator_impressum_assets
FOR SELECT
USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Owner can upsert own impressum asset" ON public.creator_impressum_assets;
CREATE POLICY "Owner can upsert own impressum asset"
ON public.creator_impressum_assets
FOR INSERT
WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Owner can update own impressum asset" ON public.creator_impressum_assets;
CREATE POLICY "Owner can update own impressum asset"
ON public.creator_impressum_assets
FOR UPDATE
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Owner can delete own impressum asset" ON public.creator_impressum_assets;
CREATE POLICY "Owner can delete own impressum asset"
ON public.creator_impressum_assets
FOR DELETE
USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all impressum assets" ON public.creator_impressum_assets;
CREATE POLICY "Admins can manage all impressum assets"
ON public.creator_impressum_assets
FOR ALL
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');

-- 4) Storage Bucket (privat)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-impressum',
  'creator-impressum',
  false,
  3145728, -- 3 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5) Storage Policies (kein public direct read)
DROP POLICY IF EXISTS "Creator can upload own impressum image" ON storage.objects;
CREATE POLICY "Creator can upload own impressum image"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'creator-impressum'
  AND auth.role() = 'authenticated'
  AND name LIKE auth.uid()::text || '/%'
);

DROP POLICY IF EXISTS "Creator can read own impressum image" ON storage.objects;
CREATE POLICY "Creator can read own impressum image"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'creator-impressum'
  AND auth.role() = 'authenticated'
  AND name LIKE auth.uid()::text || '/%'
);

DROP POLICY IF EXISTS "Creator can update own impressum image" ON storage.objects;
CREATE POLICY "Creator can update own impressum image"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'creator-impressum'
  AND auth.role() = 'authenticated'
  AND name LIKE auth.uid()::text || '/%'
);

DROP POLICY IF EXISTS "Creator can delete own impressum image" ON storage.objects;
CREATE POLICY "Creator can delete own impressum image"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'creator-impressum'
  AND auth.role() = 'authenticated'
  AND name LIKE auth.uid()::text || '/%'
);

DROP POLICY IF EXISTS "Admin can manage creator impressum images" ON storage.objects;
CREATE POLICY "Admin can manage creator impressum images"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'creator-impressum'
  AND get_my_role() = 'admin'
)
WITH CHECK (
  bucket_id = 'creator-impressum'
  AND get_my_role() = 'admin'
);

-- 6) Strukturierte Impressum-Daten (Creator gibt Daten ein, System erzeugt Bild)
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

DROP TRIGGER IF EXISTS trg_creator_impressum_details_updated_at ON public.creator_impressum_details;
CREATE TRIGGER trg_creator_impressum_details_updated_at
BEFORE UPDATE ON public.creator_impressum_details
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_creator_impressum_assets();

DROP POLICY IF EXISTS "Owner can read own impressum details" ON public.creator_impressum_details;
CREATE POLICY "Owner can read own impressum details"
ON public.creator_impressum_details
FOR SELECT
USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Owner can upsert own impressum details" ON public.creator_impressum_details;
CREATE POLICY "Owner can upsert own impressum details"
ON public.creator_impressum_details
FOR INSERT
WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Owner can update own impressum details" ON public.creator_impressum_details;
CREATE POLICY "Owner can update own impressum details"
ON public.creator_impressum_details
FOR UPDATE
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all impressum details" ON public.creator_impressum_details;
CREATE POLICY "Admins can manage all impressum details"
ON public.creator_impressum_details
FOR ALL
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');
