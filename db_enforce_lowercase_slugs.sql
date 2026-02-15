-- ============================================================
-- DB-CONSTRAINT: Erzwinge lowercase für alle Slugs
-- Grund: URLs sind immer lowercase, DB muss das garantieren
-- ============================================================

-- 1. Check Constraint für artist_name_slug
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_slug_lowercase_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_slug_lowercase_check 
CHECK (artist_name_slug = LOWER(artist_name_slug));

-- 2. Bestehende Slugs normalisieren (falls noch nicht geschehen)
UPDATE public.profiles
SET artist_name_slug = LOWER(artist_name_slug)
WHERE artist_name_slug IS NOT NULL
  AND artist_name_slug != LOWER(artist_name_slug);

-- 3. Funktion für Auto-Lowercase (optional, zusätzliche Absicherung)
CREATE OR REPLACE FUNCTION enforce_lowercase_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.artist_name_slug IS NOT NULL THEN
    NEW.artist_name_slug := LOWER(NEW.artist_name_slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger aktivieren
DROP TRIGGER IF EXISTS trigger_enforce_lowercase_slug ON public.profiles;

CREATE TRIGGER trigger_enforce_lowercase_slug
BEFORE INSERT OR UPDATE OF artist_name_slug ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION enforce_lowercase_slug();

-- ============================================================
-- PRECHECK
-- ============================================================
SELECT 
  'CHECK constraint aktiv?' AS test,
  COUNT(*) AS anzahl
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_slug_lowercase_check';

SELECT 
  'Trigger aktiv?' AS test,
  COUNT(*) AS anzahl
FROM information_schema.triggers
WHERE trigger_name = 'trigger_enforce_lowercase_slug';

-- Zeige alle Slugs (sollten alle lowercase sein)
SELECT 
  id, 
  artist_name, 
  artist_name_slug,
  CASE 
    WHEN artist_name_slug = LOWER(artist_name_slug) THEN '✅ OK'
    ELSE '❌ NICHT lowercase'
  END AS status
FROM public.profiles
WHERE artist_name_slug IS NOT NULL
ORDER BY artist_name_slug;
