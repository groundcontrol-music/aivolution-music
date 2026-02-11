-- =====================================================
-- SECURITY FIXES + BAD-WORD-FILTER SYSTEM
-- =====================================================

-- 1. FIX: search_path für SECURITY DEFINER Funktionen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, artist_name, role, onboarding_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'artist_name', split_part(NEW.email, '@', 1)),
    'user', -- Neu: Jeder startet als 'user'
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_inactive_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM public.profiles
    WHERE 
      (onboarding_status IS NULL OR onboarding_status = 'pending')
      AND created_at < NOW() - INTERVAL '14 days'
  );
END;
$$;

-- 2. BAD-WORD-FILTER: Editierbare Blacklist
CREATE TABLE IF NOT EXISTS public.content_filters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  word text NOT NULL UNIQUE,
  severity text DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.content_filters ENABLE ROW LEVEL SECURITY;

-- Public Read (für Filter-Check)
CREATE POLICY "Public can read active filters" ON public.content_filters
  FOR SELECT USING (is_active = true);

-- Admin Edit
CREATE POLICY "Admins can manage filters" ON public.content_filters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Standard Bad-Words (erweiterbarer)
INSERT INTO public.content_filters (word, severity) VALUES
  ('nazi', 'high'),
  ('hitler', 'high'),
  ('fuck', 'medium'),
  ('shit', 'medium'),
  ('ass', 'low'),
  ('idiot', 'low')
ON CONFLICT (word) DO NOTHING;

-- 3. FUNKTION: Content-Filter (Server-Side Check)
CREATE OR REPLACE FUNCTION public.check_content_safety(content text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bad_word text;
BEGIN
  IF content IS NULL OR content = '' THEN
    RETURN true;
  END IF;

  -- Hole alle aktiven Bad-Words
  FOR bad_word IN 
    SELECT word FROM public.content_filters WHERE is_active = true
  LOOP
    IF LOWER(content) LIKE '%' || LOWER(bad_word) || '%' THEN
      RETURN false; -- Bad Word gefunden
    END IF;
  END LOOP;

  RETURN true; -- Alles sauber
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_content_safety(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_content_safety(text) TO anon;

-- 4. Rollen-Update: Profil-Freischaltung setzt role auf 'creator'
-- (Wird via Admin-Action gemacht, kein Trigger nötig)
