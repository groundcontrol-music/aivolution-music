-- ============================================================
-- NOTIFICATIONS: Status-Spalte für Grün/Rot-Anzeige
-- ============================================================
-- Fügt "status" zu messages hinzu für visuelle Notifications

-- 1. Spalte hinzufügen (falls nicht vorhanden)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS status TEXT;

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS idx_messages_status 
ON public.messages(recipient_id, status, is_read, created_at DESC);

-- 3. Schema neu laden
NOTIFY pgrst, 'reload schema';

SELECT '✅ Notifications Status-Spalte hinzugefügt!' AS status;

-- ============================================================
-- VERWENDUNG
-- ============================================================
-- status = 'approved' → Grünes Icon (Freischaltung)
-- status = 'rejected' → Rotes Icon (Ablehnung)
-- status = NULL → Normales Icon (System-Message)
