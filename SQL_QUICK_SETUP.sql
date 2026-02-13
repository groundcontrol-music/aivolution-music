-- ============================================================
-- QUICK SETUP: Alle Fixes in EINER Datei (für schnelles Setup)
-- ============================================================
-- Führe diese EINE Datei aus, statt 5 einzelne Dateien
-- Reihenfolge ist korrekt, keine Abhängigkeits-Probleme

-- ============================================================
-- 1. FUNCTION: get_my_role() mit CASCADE
-- ============================================================
DROP FUNCTION IF EXISTS get_my_role() CASCADE;
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- ============================================================
-- 2. SPALTEN HINZUFÜGEN (ZUERST! Bevor Policies erstellt werden)
-- ============================================================

-- Visibility für Profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'pending';

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_visibility_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_visibility_check 
CHECK (visibility IN ('pending', 'public', 'rejected'));

-- Status für Messages (grün/rot)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS status TEXT;

-- related_slug für Messages (Profil-Links)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS related_slug TEXT;

-- ============================================================
-- 3. ALLE Policies löschen (auf allen Tabellen)
-- ============================================================
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  -- Profiles
  FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles CASCADE';
  END LOOP;
  
  -- Songs
  FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = 'songs' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.songs CASCADE';
  END LOOP;
  
  -- Promo Slots
  FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = 'promo_slots' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.promo_slots CASCADE';
  END LOOP;
  
  -- Messages
  FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = 'messages' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.messages CASCADE';
  END LOOP;
END $$;

-- ============================================================
-- 4. NEUE Policies: PROFILES
-- ============================================================
CREATE POLICY "Users can read own profile" 
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" 
  ON public.profiles FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins can update any profile" 
  ON public.profiles FOR UPDATE
  USING (get_my_role() = 'admin');

-- Öffentliche Creator-Profile (für Startseite)
CREATE POLICY "Public can read public creators" 
  ON public.profiles FOR SELECT
  USING (role = 'creator' AND visibility = 'public');

-- ============================================================
-- 5. NEUE Policies: SONGS
-- ============================================================
CREATE POLICY "Public can read released songs" 
  ON public.songs FOR SELECT
  USING (is_probe = false);

CREATE POLICY "Users can read own songs" 
  ON public.songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own songs" 
  ON public.songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own songs" 
  ON public.songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs" 
  ON public.songs FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all songs" 
  ON public.songs FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins can update any song" 
  ON public.songs FOR UPDATE
  USING (get_my_role() = 'admin');

-- ============================================================
-- 6. NEUE Policies: PROMO_SLOTS
-- ============================================================
CREATE POLICY "Public can read promo_slots" 
  ON public.promo_slots FOR SELECT
  USING (true);

CREATE POLICY "Admins can update promo_slots" 
  ON public.promo_slots FOR UPDATE
  USING (get_my_role() = 'admin');

-- ============================================================
-- 7. NEUE Policies: MESSAGES
-- ============================================================
CREATE POLICY "Users can read own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can send private messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND message_type = 'private');

CREATE POLICY "System can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id IS NULL AND message_type = 'system');

CREATE POLICY "Users can mark messages as read"
  ON public.messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Admins can create system messages" 
  ON public.messages FOR INSERT
  WITH CHECK (get_my_role() = 'admin' AND message_type = 'system');

CREATE POLICY "Admins can read all messages" 
  ON public.messages FOR SELECT
  USING (get_my_role() = 'admin');

-- ============================================================
-- 8. Indizes für Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_visibility 
ON public.profiles(visibility, role) 
WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_messages_status 
ON public.messages(recipient_id, status, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_related 
ON public.messages(related_slug) 
WHERE related_slug IS NOT NULL;

-- ============================================================
-- 9. Login-Helper Tabelle (für Login mit Künstlername)
-- ============================================================
-- Ermöglicht Login mit artist_name statt Email (DSGVO-freundlich)

CREATE TABLE IF NOT EXISTS public.artist_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name_lower TEXT NOT NULL UNIQUE, -- lowercase für case-insensitive lookup
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnellen Login-Lookup
CREATE INDEX IF NOT EXISTS idx_artist_logins_name 
ON public.artist_logins(artist_name_lower);

-- RLS für artist_logins
ALTER TABLE public.artist_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read artist logins for auth"
  ON public.artist_logins FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own login"
  ON public.artist_logins FOR ALL
  USING (auth.uid() = user_id);

-- Trigger: Auto-sync mit profiles.artist_name
CREATE OR REPLACE FUNCTION sync_artist_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Bei INSERT/UPDATE von artist_name in profiles
  IF NEW.artist_name IS NOT NULL THEN
    INSERT INTO public.artist_logins (user_id, artist_name_lower)
    VALUES (NEW.id, LOWER(NEW.artist_name))
    ON CONFLICT (artist_name_lower) 
    DO UPDATE SET 
      artist_name_lower = LOWER(NEW.artist_name),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_artist_login ON public.profiles;
CREATE TRIGGER trigger_sync_artist_login
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_artist_login();

-- ============================================================
-- 10. Migration: Bestehende Profile auf visibility setzen
-- ============================================================
UPDATE public.profiles
SET visibility = 'public'
WHERE role = 'creator' AND onboarding_status = 'approved' AND visibility IS NULL;

UPDATE public.profiles
SET visibility = 'pending'
WHERE onboarding_status IN ('pending', 'submitted') AND visibility IS NULL;

UPDATE public.profiles
SET visibility = 'rejected'
WHERE onboarding_status = 'rejected' AND visibility IS NULL;

-- ============================================================
-- 11. Schema neu laden
-- ============================================================
NOTIFY pgrst, 'reload schema';

SELECT '✅✅✅ QUICK SETUP KOMPLETT! Alle Fixes angewendet! ✅✅✅' AS status;
