-- ============================================================
-- MESSAGES: related_slug für direkte Profil-Links
-- ============================================================
-- Ermöglicht Admin, direkt von Message zum Creator-Profil zu springen

-- 1. related_slug zu messages (für direkte Profil-Links)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS related_slug TEXT;

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS idx_messages_related 
ON public.messages(related_slug) 
WHERE related_slug IS NOT NULL;

-- 3. Schema neu laden
NOTIFY pgrst, 'reload schema';

SELECT '✅ Messages related_slug hinzugefügt!' AS status;

-- ============================================================
-- VERWENDUNG
-- ============================================================
-- Bei Creator-Bewerbung:
-- INSERT INTO messages (..., related_slug) VALUES (..., 'dj-beatmaster')
-- Admin kann dann direkt zu /creator/dj-beatmaster springen
