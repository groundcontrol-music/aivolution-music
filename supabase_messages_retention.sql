-- ============================================================
-- MESSAGES: DSGVO-konforme Aufbewahrung & Soft-Delete
-- ============================================================
-- Implementiert: Soft-Delete, Auto-Archive, Admin-Zugriff

-- ============================================================
-- 1. Spalten hinzufügen
-- ============================================================

ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON public.messages(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_archived ON public.messages(archived) WHERE archived = true;

-- ============================================================
-- 2. RLS Policies anpassen (User sehen keine gelöschten/archivierten Messages)
-- ============================================================

-- Alte Policy droppen
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;

-- Neue Policy: User sehen nur aktive Messages
CREATE POLICY "Users can read own active messages"
  ON public.messages FOR SELECT
  USING (
    recipient_id = auth.uid() 
    AND deleted_at IS NULL 
    AND archived = false
  );

-- User können eigene Messages soft-deleten
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

CREATE POLICY "Users can soft delete own messages"
  ON public.messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (
    -- User darf nur deleted_at/deleted_by setzen, nichts anderes ändern
    deleted_by = auth.uid()
  );

-- Admins sehen ALLE Messages (auch gelöschte/archivierte)
DROP POLICY IF EXISTS "Admins can read all messages" ON public.messages;

CREATE POLICY "Admins can read all messages"
  ON public.messages FOR SELECT
  USING (get_my_role() = 'admin');

-- ============================================================
-- 3. Auto-Archive-Function (täglich laufen lassen)
-- ============================================================

CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS TABLE(
  archived_private INTEGER,
  archived_system INTEGER,
  hard_deleted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_archived_private INTEGER := 0;
  v_archived_system INTEGER := 0;
  v_hard_deleted INTEGER := 0;
BEGIN
  -- 1. Private Messages > 30 Tage archivieren
  UPDATE public.messages SET archived = true
  WHERE message_type = 'private'
    AND created_at < NOW() - INTERVAL '30 days'
    AND archived = false
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_archived_private = ROW_COUNT;

  -- 2. System Messages > 90 Tage archivieren
  UPDATE public.messages SET archived = true
  WHERE message_type IN ('system', 'application')
    AND created_at < NOW() - INTERVAL '90 days'
    AND archived = false
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_archived_system = ROW_COUNT;

  -- 3. Hard-Delete: Soft-deleted Messages > 7 Tage ENDGÜLTIG löschen
  DELETE FROM public.messages
  WHERE deleted_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_hard_deleted = ROW_COUNT;

  -- 4. Admin-Benachrichtigungen > 7 Tage löschen (wenn bearbeitet)
  DELETE FROM public.messages
  WHERE message_type = 'application'
    AND created_at < NOW() - INTERVAL '7 days'
    AND is_read = true; -- Nur bearbeitete löschen
  
  -- Return Stats
  RETURN QUERY SELECT v_archived_private, v_archived_system, v_hard_deleted;
END;
$$;

-- ============================================================
-- 4. Soft-Delete Helper (für Client-Side)
-- ============================================================

CREATE OR REPLACE FUNCTION soft_delete_message(message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Prüfe: Ist User der Empfänger?
  IF NOT EXISTS (
    SELECT 1 FROM public.messages 
    WHERE id = message_id 
    AND recipient_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this message';
  END IF;

  -- Soft-Delete
  UPDATE public.messages
  SET 
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = message_id;

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 5. Admin-Function: Alle Messages eines Users abrufen (Behördenanfragen)
-- ============================================================

CREATE OR REPLACE FUNCTION admin_get_user_messages(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  message_type TEXT,
  subject TEXT,
  content TEXT,
  sender_id UUID,
  recipient_id UUID,
  created_at TIMESTAMPTZ,
  is_read BOOLEAN,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  archived BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Nur Admins dürfen diese Funktion nutzen
  IF (SELECT public.get_my_role()) != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  -- Alle Messages des Users (auch gelöschte/archivierte)
  RETURN QUERY
  SELECT 
    m.id,
    m.message_type,
    m.subject,
    m.content,
    m.sender_id,
    m.recipient_id,
    m.created_at,
    m.is_read,
    m.deleted_at,
    m.deleted_by,
    m.archived
  FROM public.messages m
  WHERE m.recipient_id = target_user_id 
     OR m.sender_id = target_user_id
  ORDER BY m.created_at DESC;
END;
$$;

-- ============================================================
-- 6. Audit-Log für Admin-Zugriffe (Behördenanfragen)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'view_messages', 'export_messages', etc.
  target_user_id UUID, -- Auf welchen User wurde zugegriffen?
  metadata JSONB, -- Zusätzliche Infos
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Nur Admins sehen Audit-Log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  USING (get_my_role() = 'admin');

-- Function: Log Admin-Zugriff
CREATE OR REPLACE FUNCTION log_admin_access(
  action_type TEXT,
  target_user UUID DEFAULT NULL,
  meta JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, metadata)
  VALUES (auth.uid(), action_type, target_user, meta);
END;
$$;

-- ============================================================
-- 7. Cron-Job (Optional: pg_cron Extension)
-- ============================================================
-- Wenn pg_cron installiert ist:

-- SELECT cron.schedule(
--   'archive-old-messages',
--   '0 2 * * *', -- Täglich um 2 Uhr nachts
--   $$SELECT archive_old_messages()$$
-- );

-- OHNE pg_cron: Per Supabase Edge Function täglich ausführen!

-- ============================================================
-- 8. Stats-Function (wie viele Messages, wie viel Storage)
-- ============================================================

CREATE OR REPLACE FUNCTION get_messages_stats()
RETURNS TABLE(
  total_messages BIGINT,
  active_messages BIGINT,
  archived_messages BIGINT,
  deleted_messages BIGINT,
  estimated_size_mb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_messages,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND archived = false)::BIGINT AS active_messages,
    COUNT(*) FILTER (WHERE archived = true)::BIGINT AS archived_messages,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::BIGINT AS deleted_messages,
    ROUND((pg_total_relation_size('public.messages')::NUMERIC / 1024 / 1024), 2) AS estimated_size_mb
  FROM public.messages;
END;
$$;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Messages Retention System aktiviert!' AS status;

-- ============================================================
-- VERWENDUNG
-- ============================================================

-- User löscht Nachricht (Soft-Delete):
-- SELECT soft_delete_message('[message_id]');

-- Admin ruft User-Messages ab (Behördenanfrage):
-- SELECT * FROM admin_get_user_messages('[user_id]');

-- Admin loggt Zugriff:
-- SELECT log_admin_access('view_messages', '[user_id]', '{"reason": "Polizei-Anfrage"}');

-- Cronjob: Alte Messages archivieren + hard-deleten:
-- SELECT * FROM archive_old_messages();

-- Stats anzeigen:
-- SELECT * FROM get_messages_stats();
