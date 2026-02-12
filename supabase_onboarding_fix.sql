-- =====================================================
-- ONBOARDING FIX: Spalten + RLS Policy + Schema Reload
-- =====================================================

-- 1. Alle benötigten Spalten sicherstellen
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS artist_name text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS tech_stack text[],
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS main_genres text[],
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. RLS Policy: User darf eigenes Profil UPDATEN
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. RLS Policy: User darf eigenes Profil LESEN (falls nicht schon vorhanden)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 4. Schema Cache neu laden (wichtig!)
NOTIFY pgrst, 'reload schema';

-- Success-Meldung
SELECT 'Profiles Table & RLS ready! 🚀' AS status;
