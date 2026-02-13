-- ============================================================
-- CREATOR PROFILE V2: SLUG + ONBOARDING STATUS UPDATE
-- ============================================================

-- 1. Spalte für URL-Slug hinzufügen
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS artist_name_slug TEXT UNIQUE;

-- 2. Funktion zum Generieren von URL-Slugs
CREATE OR REPLACE FUNCTION generate_artist_slug(artist_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
BEGIN
  -- Erstelle Basis-Slug (lowercase, Leerzeichen -> Bindestriche, Sonderzeichen entfernen)
  base_slug := LOWER(TRIM(artist_name));
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
  
  final_slug := base_slug;
  
  -- Prüfe Eindeutigkeit (falls Slug schon existiert, füge Zahl hinzu)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE artist_name_slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger: Auto-generate slug beim Insert/Update
CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.artist_name IS NOT NULL AND (NEW.artist_name_slug IS NULL OR OLD.artist_name IS DISTINCT FROM NEW.artist_name) THEN
    NEW.artist_name_slug := generate_artist_slug(NEW.artist_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_slug ON public.profiles;
CREATE TRIGGER trigger_auto_generate_slug
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug();

-- 4. Bestehende Slugs generieren (für bereits existierende Profile)
UPDATE public.profiles
SET artist_name_slug = generate_artist_slug(artist_name)
WHERE artist_name IS NOT NULL AND artist_name_slug IS NULL;

-- 5. Index für Performance
CREATE INDEX IF NOT EXISTS idx_artist_slug ON public.profiles(artist_name_slug);

-- 6. Schema Cache neu laden
NOTIFY pgrst, 'reload schema';
