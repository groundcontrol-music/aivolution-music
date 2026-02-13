-- ============================================================
-- PROMO_SLOTS: body_text Spalte + Slots 5 & 99 sicherstellen
-- ============================================================

-- 1. body_text Spalte hinzufügen (längerer Fließtext für Boxen)
ALTER TABLE public.promo_slots 
ADD COLUMN IF NOT EXISTS body_text TEXT;

-- 2. Falls Slot 5 (Highlight) und 99 (Welcome) noch nicht existieren:
INSERT INTO public.promo_slots (slot_id, title, subtitle)
SELECT 5, 'AUDIO CORE', 'Technologische Einblicke.'
WHERE NOT EXISTS (SELECT 1 FROM public.promo_slots WHERE slot_id = 5);

INSERT INTO public.promo_slots (slot_id, title, subtitle)
SELECT 99, 'Willkommen', 'Hier steht der Einleitungstext für die Community...'
WHERE NOT EXISTS (SELECT 1 FROM public.promo_slots WHERE slot_id = 99);

NOTIFY pgrst, 'reload schema';
