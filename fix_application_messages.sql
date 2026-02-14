-- Fix: Erlaube das Erstellen von Application-Messages
-- Problem: Neue Creator können keine Messages an Admins senden (RLS blockiert)

-- Neue Policy: User können application-Messages erstellen (für Bewerbungen)
CREATE POLICY "Users can create application messages" 
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND message_type = 'application'
    AND sender_id IS NULL -- System-generiert
  );

-- Schema-Reload
NOTIFY pgrst, 'reload schema';
