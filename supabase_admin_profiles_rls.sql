-- ============================================================
-- ADMIN: Profiles UPDATE/SELECT für Kuration (Freischaltung)
-- ============================================================
-- Admins müssen andere Profile lesen und updaten können!
-- Führe im Supabase SQL Editor aus.

-- 1. Admins dürfen ALLE Profile LESEN (für Kuration/Applications)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" 
  ON public.profiles FOR SELECT 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 2. Admins dürfen ALLE Profile UPDATEN (Freischaltung, Rolle ändern)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
  ON public.profiles FOR UPDATE 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 3. Admins dürfen Songs anderer User updaten (is_probe → false bei Freischaltung)
DROP POLICY IF EXISTS "Admins can update any song" ON public.songs;
CREATE POLICY "Admins can update any song" 
  ON public.songs FOR UPDATE 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

NOTIFY pgrst, 'reload schema';

SELECT 'Admin RLS für Profiles + Songs bereit! ✓' AS status;
