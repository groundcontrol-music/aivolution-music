-- ============================================================
-- DEBUG: Infinite Recursion Problem
-- ============================================================
-- Prüft, ob alle Fixes korrekt angewendet wurden

-- ============================================================
-- 1. Prüfe ob get_my_role() Funktion existiert
-- ============================================================
SELECT 
  proname AS function_name,
  prosecdef AS is_security_definer,
  proconfig AS search_path_config
FROM pg_proc 
WHERE proname = 'get_my_role';

-- Erwartetes Ergebnis:
-- function_name: get_my_role
-- is_security_definer: true
-- search_path_config: {search_path=}

-- ============================================================
-- 2. Prüfe alle Policies auf promo_slots
-- ============================================================
SELECT 
  policyname AS policy_name,
  cmd AS command,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies 
WHERE tablename = 'promo_slots';

-- PROBLEM-Indikator: Wenn using_clause "(SELECT role..." enthält
-- LÖSUNG: Should be "get_my_role()"

-- ============================================================
-- 3. Prüfe alle Policies auf profiles
-- ============================================================
SELECT 
  policyname AS policy_name,
  cmd AS command,
  qual AS using_clause
FROM pg_policies 
WHERE tablename = 'profiles';

-- ============================================================
-- 4. Prüfe deine Admin-Rolle
-- ============================================================
SELECT 
  p.id,
  p.artist_name,
  p.role,
  p.onboarding_status
FROM public.profiles p
WHERE p.id = auth.uid();

-- Erwartetes Ergebnis:
-- role: 'admin'

-- ============================================================
-- 5. Test: Kann get_my_role() aufgerufen werden?
-- ============================================================
SELECT get_my_role() AS my_role;

-- Erwartetes Ergebnis:
-- my_role: 'admin'

-- ============================================================
-- ZUSAMMENFASSUNG
-- ============================================================
-- Wenn EINER dieser Tests fehlschlägt, ist das die Ursache!
