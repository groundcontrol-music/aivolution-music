-- ============================================================
-- PROMO_SLOTS FIX: Spalten + RLS für Admin-Update
-- ============================================================
-- Führe dieses Script im Supabase SQL Editor aus!

-- 1. Spalten hinzufügen (falls noch nicht vorhanden)
ALTER TABLE public.promo_slots 
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_id TEXT;

-- 2. RLS prüfen: Falls promo_slots RLS hat, brauchen wir Admin-Update-Policy
-- Zuerst: RLS aktivieren (falls noch nicht)
ALTER TABLE public.promo_slots ENABLE ROW LEVEL SECURITY;

-- 3. Alle können promo_slots LESEN (öffentliche Startseite)
DROP POLICY IF EXISTS "Public can read promo_slots" ON public.promo_slots;
CREATE POLICY "Public can read promo_slots" 
  ON public.promo_slots FOR SELECT 
  USING (true);

-- 4. Admins dürfen promo_slots UPDATEN (Media-Boxen editieren)
DROP POLICY IF EXISTS "Admins can update promo_slots" ON public.promo_slots;
CREATE POLICY "Admins can update promo_slots" 
  ON public.promo_slots FOR UPDATE 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 5. Schema Cache neu laden
NOTIFY pgrst, 'reload schema';

SELECT 'promo_slots: Spalten + RLS bereit! ✓' AS status;
