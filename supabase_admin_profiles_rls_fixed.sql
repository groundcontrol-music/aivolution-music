-- ============================================================
-- ADMIN: Profiles UPDATE/SELECT für Kuration (Freischaltung)
-- ============================================================
-- FIXED: Verwendet get_my_role() statt direkter Subquery
-- Verhindert "infinite recursion detected in policy"

-- WICHTIG: Führe ZUERST supabase_security_fixes.sql aus!
-- (Erstellt die get_my_role() Funktion)

-- 1. Admins dürfen ALLE Profile LESEN (für Kuration/Applications)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" 
  ON public.profiles FOR SELECT 
  USING (
    get_my_role() = 'admin'
  );

-- 2. Admins dürfen ALLE Profile UPDATEN (Freischaltung, Rolle ändern)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
  ON public.profiles FOR UPDATE 
  USING (
    get_my_role() = 'admin'
  );

-- 3. Admins dürfen Songs anderer User updaten (is_probe → false bei Freischaltung)
DROP POLICY IF EXISTS "Admins can update any song" ON public.songs;
CREATE POLICY "Admins can update any song" 
  ON public.songs FOR UPDATE 
  USING (
    get_my_role() = 'admin'
  );

-- 4. Admins dürfen alle Songs lesen (für Kuration/Vorschau)
DROP POLICY IF EXISTS "Admins can read all songs" ON public.songs;
CREATE POLICY "Admins can read all songs" 
  ON public.songs FOR SELECT 
  USING (
    get_my_role() = 'admin'
  );

NOTIFY pgrst, 'reload schema';

SELECT '✅ Admin RLS für Profiles + Songs bereit (FIXED)!' AS status;
