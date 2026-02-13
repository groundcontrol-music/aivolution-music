-- ============================================================
-- FORCE FIX: Löscht ALLE alten Policies und erstellt neue
-- ============================================================
-- Nutze dies, wenn supabase_fix_recursion.sql nicht funktioniert hat

-- ============================================================
-- 1. ALLE Policies auf profiles löschen
-- ============================================================
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
  END LOOP;
END $$;

-- ============================================================
-- 2. NEUE sichere Policies für profiles erstellen
-- ============================================================

-- User kann eigenes Profil lesen
CREATE POLICY "Users can read own profile" 
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- User kann eigenes Profil updaten
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User kann Profil bei Registrierung erstellen
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin kann alle Profile lesen (MIT get_my_role())
CREATE POLICY "Admins can read all profiles" 
  ON public.profiles FOR SELECT
  USING (get_my_role() = 'admin');

-- Admin kann alle Profile updaten (MIT get_my_role())
CREATE POLICY "Admins can update any profile" 
  ON public.profiles FOR UPDATE
  USING (get_my_role() = 'admin');

-- ============================================================
-- 3. ALLE Policies auf promo_slots löschen
-- ============================================================
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'promo_slots'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.promo_slots';
  END LOOP;
END $$;

-- ============================================================
-- 4. NEUE sichere Policies für promo_slots
-- ============================================================

-- Alle können promo_slots lesen (öffentlich)
CREATE POLICY "Public can read promo_slots" 
  ON public.promo_slots FOR SELECT
  USING (true);

-- Admin kann promo_slots updaten (MIT get_my_role())
CREATE POLICY "Admins can update promo_slots" 
  ON public.promo_slots FOR UPDATE
  USING (get_my_role() = 'admin');

-- ============================================================
-- 5. ALLE Policies auf songs löschen
-- ============================================================
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'songs'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.songs';
  END LOOP;
END $$;

-- ============================================================
-- 6. NEUE sichere Policies für songs
-- ============================================================

-- Alle können freigegebene Songs lesen
CREATE POLICY "Public can read released songs" 
  ON public.songs FOR SELECT
  USING (is_probe = false);

-- User kann eigene Songs lesen
CREATE POLICY "Users can read own songs" 
  ON public.songs FOR SELECT
  USING (auth.uid() = user_id);

-- User kann eigene Songs erstellen
CREATE POLICY "Users can insert own songs" 
  ON public.songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User kann eigene Songs updaten
CREATE POLICY "Users can update own songs" 
  ON public.songs FOR UPDATE
  USING (auth.uid() = user_id);

-- User kann eigene Songs löschen
CREATE POLICY "Users can delete own songs" 
  ON public.songs FOR DELETE
  USING (auth.uid() = user_id);

-- Admin kann alle Songs lesen (MIT get_my_role())
CREATE POLICY "Admins can read all songs" 
  ON public.songs FOR SELECT
  USING (get_my_role() = 'admin');

-- Admin kann alle Songs updaten (MIT get_my_role())
CREATE POLICY "Admins can update any song" 
  ON public.songs FOR UPDATE
  USING (get_my_role() = 'admin');

-- ============================================================
-- 7. Schema neu laden
-- ============================================================
NOTIFY pgrst, 'reload schema';

SELECT '✅ FORCE FIX: Alle Policies neu erstellt!' AS status;
