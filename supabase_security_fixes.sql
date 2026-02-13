-- ============================================================
-- SECURITY FIXES für Supabase Warnings
-- ============================================================
-- Behebt die Warnings im Supabase Security Advisor

-- ============================================================
-- 1. FUNCTION SEARCH PATH MUTABLE FIXES
-- ============================================================
-- Problem: Funktionen ohne search_path sind anfällig für Schema-Injection
-- Lösung: Funktionen mit "SET search_path = ''" neu erstellen

-- 1a. get_my_role (Fix)
DROP FUNCTION IF EXISTS get_my_role();
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- 1b. notify_admins_new_application (Fix)
DROP FUNCTION IF EXISTS notify_admins_new_application() CASCADE;
CREATE OR REPLACE FUNCTION notify_admins_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Trigger neu erstellen
DROP TRIGGER IF EXISTS trigger_notify_admins_application ON public.profiles;
CREATE TRIGGER trigger_notify_admins_application
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_application();

-- 1c. increment_thread_reply_count (Fix)
DROP FUNCTION IF EXISTS increment_thread_reply_count() CASCADE;
CREATE OR REPLACE FUNCTION increment_thread_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.global_forum_threads
  SET 
    reply_count = reply_count + 1,
    last_reply_at = NOW()
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$;

-- Trigger neu erstellen
DROP TRIGGER IF EXISTS trigger_increment_reply_count ON public.global_forum_replies;
CREATE TRIGGER trigger_increment_reply_count
  AFTER INSERT ON public.global_forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION increment_thread_reply_count();

-- 1d. check_report_threshold (Fix)
DROP FUNCTION IF EXISTS check_report_threshold() CASCADE;
CREATE OR REPLACE FUNCTION check_report_threshold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  creator_count INT;
BEGIN
  -- Zähle, wie viele verschiedene Creator diesen Content gemeldet haben
  SELECT COUNT(DISTINCT reporter_id)
  INTO creator_count
  FROM public.reports
  WHERE reported_content_id = NEW.reported_content_id
    AND reported_content_type = NEW.reported_content_type
    AND (SELECT role FROM public.profiles WHERE id = reporter_id) = 'creator';
  
  -- Wenn 3+ Creator gemeldet haben → Nachricht an alle Admins
  IF creator_count >= 3 THEN
    INSERT INTO public.messages (recipient_id, message_type, subject, content)
    SELECT 
      id,
      'system',
      '🚨 WARNUNG: 3-Creator-Regel ausgelöst',
      'Content-ID: ' || NEW.reported_content_id || ' (' || NEW.reported_content_type || ') wurde von 3+ Creatorn gemeldet. Bitte prüfen!'
    FROM public.profiles
    WHERE role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger neu erstellen
DROP TRIGGER IF EXISTS trigger_check_report_threshold ON public.reports;
CREATE TRIGGER trigger_check_report_threshold
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION check_report_threshold();

-- ============================================================
-- 2. RLS POLICY "ALWAYS TRUE" FIX
-- ============================================================
-- Problem: Policy "public.artists" mit USING (true) ist zu permissiv
-- Lösung: Tabelle prüfen und ggf. entfernen (vermutlich alte/ungenutzte Tabelle)

-- Prüfe ob Tabelle existiert und lösche sie, falls leer/ungenutzt
DO $$
BEGIN
  -- Wenn die Tabelle "artists" existiert und leer ist, lösche sie
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'artists') THEN
    -- Prüfe ob Tabelle Daten hat
    IF (SELECT COUNT(*) FROM public.artists) = 0 THEN
      DROP TABLE IF EXISTS public.artists CASCADE;
      RAISE NOTICE 'Tabelle "artists" wurde gelöscht (war leer und ungenutzt)';
    ELSE
      -- Falls Daten vorhanden, nur Warning
      RAISE WARNING 'Tabelle "artists" existiert und hat Daten. Bitte manuell prüfen!';
    END IF;
  END IF;
END $$;

-- Falls die Tabelle "artists" noch gebraucht wird, ersetze "USING (true)" durch sinnvolle Policy:
-- Beispiel (auskommentiert, nur falls nötig):
/*
DROP POLICY IF EXISTS "Public can read artists" ON public.artists;
CREATE POLICY "Public can read artists" 
  ON public.artists FOR SELECT
  USING (is_active = true); -- Nur aktive Artists sichtbar
*/

-- ============================================================
-- 3. LEAKED PASSWORD PROTECTION
-- ============================================================
-- Problem: Password Leak Detection ist deaktiviert
-- Lösung: In Supabase Dashboard → Authentication → Settings aktivieren
-- ODER via SQL (wenn API verfügbar):

-- HINWEIS: Diese Einstellung kann nur über das Dashboard geändert werden!
-- Gehe zu: Supabase Dashboard → Authentication → Settings → Password Policy
-- Aktiviere: "Check for leaked passwords"

-- Als Alternative: Custom Check in der Anwendung (vor Registrierung)
-- Beispiel: https://haveibeenpwned.com/API/v3#PwnedPasswords

-- ============================================================
-- ZUSAMMENFASSUNG
-- ============================================================
SELECT '✅ Security Fixes angewendet!' AS status;
SELECT '⚠️ Bitte aktiviere "Leaked Password Protection" im Supabase Dashboard!' AS reminder;
