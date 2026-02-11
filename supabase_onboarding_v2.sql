-- 1. Tabelle für editierbare Onboarding-Checkboxen
CREATE TABLE IF NOT EXISTS public.onboarding_terms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  is_required boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.onboarding_terms ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder kann lesen (für Onboarding-Seite)
CREATE POLICY "Public can read active terms" ON public.onboarding_terms
  FOR SELECT USING (is_active = true);

-- Policy: Nur Admins können editieren
CREATE POLICY "Admins can update terms" ON public.onboarding_terms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Standard-Checkboxen einfügen
INSERT INTO public.onboarding_terms (label, is_required, sort_order) VALUES
  ('Ich bin mindestens 18 Jahre alt.', true, 1),
  ('Meine Songs verstoßen nicht gegen das Grundgesetz oder Plattform-Richtlinien.', true, 2),
  ('Ich akzeptiere die AGBs und Datenschutzerklärung.', true, 3)
ON CONFLICT DO NOTHING;

-- 2. Spalte für Terms-Akzeptanz in profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS artist_name text;

-- 3. Update handle_new_user Trigger um artist_name zu speichern
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, artist_name, onboarding_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'artist_name', split_part(NEW.email, '@', 1)),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
