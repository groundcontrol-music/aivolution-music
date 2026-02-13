-- ============================================================
-- VISIBILITY SYSTEM für Creator-Profile
-- ============================================================
-- Ressourcenschonend: Eine Spalte, klare Logik
-- Sicher: RLS Policies für Zugriffskontrolle
-- Funktioniert: Keine Extra-UI, nutzt bestehende Profil-Seite

-- ============================================================
-- 1. Visibility-Spalte hinzufügen
-- ============================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'pending';

-- Erstelle Check Constraint (Datenintegrität)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_visibility_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_visibility_check 
CHECK (visibility IN ('pending', 'public', 'rejected'));

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_profiles_visibility 
ON public.profiles(visibility, role) 
WHERE visibility = 'public';

-- ============================================================
-- 2. RLS Policies aktualisieren (Sicherheit!)
-- ============================================================

-- Alte "Public can read creators" Policy entfernen (falls vorhanden)
DROP POLICY IF EXISTS "Public can read creators" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read public creator profiles" ON public.profiles;

-- NEUE Policy: Nur öffentliche Creator-Profile sind sichtbar
CREATE POLICY "Public can read public creators" 
  ON public.profiles FOR SELECT
  USING (
    role = 'creator' 
    AND visibility = 'public'
  );

-- Admins können ALLE Profile sehen (inkl. pending)
-- (Diese Policy existiert schon von force_fix_policies.sql)
-- Falls nicht, hier nochmal:
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" 
  ON public.profiles FOR SELECT
  USING (get_my_role() = 'admin');

-- ============================================================
-- 3. Bestehende Profile auf 'public' setzen (Migration)
-- ============================================================
UPDATE public.profiles
SET visibility = 'public'
WHERE role = 'creator'
  AND onboarding_status = 'approved'
  AND visibility IS NULL;

UPDATE public.profiles
SET visibility = 'pending'
WHERE onboarding_status IN ('pending', 'submitted')
  AND visibility IS NULL;

UPDATE public.profiles
SET visibility = 'rejected'
WHERE onboarding_status = 'rejected'
  AND visibility IS NULL;

-- ============================================================
-- 4. Schema neu laden
-- ============================================================
NOTIFY pgrst, 'reload schema';

SELECT '✅ Visibility System eingerichtet!' AS status;

-- ============================================================
-- VERWENDUNG
-- ============================================================
-- 'pending'  = Wartet auf Freischaltung (nur Admin sieht)
-- 'public'   = Öffentlich sichtbar (alle sehen)
-- 'rejected' = Abgelehnt (niemand außer Admin sieht)

-- VORTEIL: Keine Extra-Queries nötig!
-- WHERE visibility = 'public' filtert automatisch via RLS
