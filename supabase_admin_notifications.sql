-- ============================================================
-- ADMIN NOTIFICATIONS & HELPER FUNCTIONS
-- ============================================================
-- 1. RPC-Funktion zum Abrufen der eigenen Role
-- 2. Admin-Policies für Messages
-- 3. Trigger für automatische Benachrichtigungen bei neuen Bewerbungen

-- 1. RPC-Funktion: get_my_role (wird in admin/actions.ts verwendet)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Admin Policy für Messages: Admins dürfen System-Messages erstellen
DROP POLICY IF EXISTS "Admins can create system messages" ON public.messages;
CREATE POLICY "Admins can create system messages" 
  ON public.messages FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    AND message_type = 'system'
  );

-- 4. Admin Policy: Admins können alle Messages lesen (für Kommandozentrale)
DROP POLICY IF EXISTS "Admins can read all messages" ON public.messages;
CREATE POLICY "Admins can read all messages" 
  ON public.messages FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 5. Funktion: Benachrichtige alle Admins bei neuer Bewerbung
CREATE OR REPLACE FUNCTION notify_admins_new_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Nur wenn Status zu 'submitted' wechselt (neue Bewerbung)
  IF NEW.onboarding_status = 'submitted' AND OLD.onboarding_status != 'submitted' THEN
    
    -- Schicke Message an alle Admins
    INSERT INTO public.messages (recipient_id, sender_id, message_type, subject, content, related_id)
    SELECT 
      p.id,
      NULL, -- NULL = System Message
      'system',
      '🎸 Neue Creator-Bewerbung',
      'Creator "' || NEW.artist_name || '" hat sich beworben. Prüfe die Bewerbung im Admin-Panel.',
      NEW.id -- related_id = profile.id des Bewerbers
    FROM public.profiles p
    WHERE p.role = 'admin';
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger: Bei Profile-Update → Admins benachrichtigen
DROP TRIGGER IF EXISTS trigger_notify_admins_application ON public.profiles;
CREATE TRIGGER trigger_notify_admins_application
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_application();

-- 7. Schema neu laden
NOTIFY pgrst, 'reload schema';

SELECT '✅ Admin-Notifications aktiviert!' AS status;
