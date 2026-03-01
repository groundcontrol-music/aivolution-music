-- Tabelle für rechtliche Seiten (Impressum, AGB, Datenschutz, Hilfe) – in Supabase SQL Editor ausführen
-- RLS: öffentlicher Lesezugriff; Schreiben nur für Admin (über Service oder get_my_role)

CREATE TABLE IF NOT EXISTS public.legal_pages (
  key text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed
INSERT INTO public.legal_pages (key, title, content) VALUES
  ('impressum', 'Impressum', 'Aivolution Music Hosting\nLandstrasse 73\n31717 Nordsehl\n\nKontakt: folgt\n\nTexte unter Kommandozentrale → Terms verwalten bearbeiten.'),
  ('agb', 'AGB', 'Allgemeine Geschäftsbedingungen von Aivolution Music. Hier können Sie die AGB in der Kommandozentrale unter Terms verwalten bearbeiten.'),
  ('datenschutz', 'Datenschutz', 'Datenschutzerklärung von Aivolution Music. Hier können Sie den Inhalt in der Kommandozentrale unter Terms verwalten bearbeiten.'),
  ('hilfe', 'Hilfe', 'Hilfe und häufig gestellte Fragen. Hier können Sie den Inhalt in der Kommandozentrale unter Terms verwalten bearbeiten.')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- Policies: DROP IF EXISTS, damit das Script mehrfach lauffähig ist
DROP POLICY IF EXISTS "Legal pages are publicly readable" ON public.legal_pages;
CREATE POLICY "Legal pages are publicly readable"
  ON public.legal_pages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can update legal pages" ON public.legal_pages;
CREATE POLICY "Only admins can update legal pages"
  ON public.legal_pages FOR UPDATE
  USING ((SELECT public.get_my_role()) = 'admin');

DROP POLICY IF EXISTS "Only admins can insert legal pages" ON public.legal_pages;
CREATE POLICY "Only admins can insert legal pages"
  ON public.legal_pages FOR INSERT
  WITH CHECK ((SELECT public.get_my_role()) = 'admin');
