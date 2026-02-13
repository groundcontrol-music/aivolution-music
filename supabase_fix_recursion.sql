-- ============================================================
-- FIX: Infinite Recursion in RLS Policies
-- ============================================================
-- Problem: Policies auf profiles machen Subqueries auf profiles selbst
-- Lösung: Verwende get_my_role() Funktion (mit SECURITY DEFINER)

-- WICHTIG: Führe ZUERST supabase_security_fixes.sql aus!
-- (Erstellt die get_my_role() Funktion mit SECURITY DEFINER)

-- ============================================================
-- 1. FIX: Admin Policies auf PROFILES (Recursion-Problem!)
-- ============================================================

-- DROP alte Policies (mit Recursion-Problem)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- NEUE Policies mit get_my_role() (verhindert Recursion)
CREATE POLICY "Admins can read all profiles" 
  ON public.profiles FOR SELECT 
  USING (
    get_my_role() = 'admin'
  );

CREATE POLICY "Admins can update any profile" 
  ON public.profiles FOR UPDATE 
  USING (
    get_my_role() = 'admin'
  );

-- ============================================================
-- 2. FIX: Admin Policies auf SONGS
-- ============================================================

DROP POLICY IF EXISTS "Admins can update any song" ON public.songs;
DROP POLICY IF EXISTS "Admins can read all songs" ON public.songs;

CREATE POLICY "Admins can update any song" 
  ON public.songs FOR UPDATE 
  USING (
    get_my_role() = 'admin'
  );

CREATE POLICY "Admins can read all songs" 
  ON public.songs FOR SELECT 
  USING (
    get_my_role() = 'admin'
  );

-- ============================================================
-- 3. FIX: Admin Policies auf MESSAGES
-- ============================================================

DROP POLICY IF EXISTS "Admins can create system messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can read all messages" ON public.messages;

CREATE POLICY "Admins can create system messages" 
  ON public.messages FOR INSERT
  WITH CHECK (
    get_my_role() = 'admin'
    AND message_type = 'system'
  );

CREATE POLICY "Admins can read all messages" 
  ON public.messages FOR SELECT
  USING (
    get_my_role() = 'admin'
  );

-- ============================================================
-- 4. FIX: Promo Slots (falls vorhanden)
-- ============================================================

DROP POLICY IF EXISTS "Admins can update promo slots" ON public.promo_slots;

CREATE POLICY "Admins can update promo slots" 
  ON public.promo_slots FOR UPDATE 
  USING (
    get_my_role() = 'admin'
  );

-- ============================================================
-- 5. Schema neu laden
-- ============================================================

NOTIFY pgrst, 'reload schema';

SELECT '✅ Recursion-Probleme behoben! Policies verwenden jetzt get_my_role()' AS status;

-- ============================================================
-- DEBUG: Prüfe ob get_my_role() existiert
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_role') THEN
    RAISE WARNING 'WARNUNG: get_my_role() Funktion existiert nicht! Führe zuerst supabase_security_fixes.sql aus!';
  END IF;
END $$;
