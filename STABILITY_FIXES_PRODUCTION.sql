-- ============================================================
-- PRODUCTION STABILITY FIXES
-- Für: Hunderte Creators/Tag (Race Conditions, Performance, Skalierung)
-- ============================================================

-- ============================================================
-- PROBLEM 1: Race Condition bei Slug-Generierung
-- Symptom: Bei gleichzeitigen Signups können 2 Creator denselben Slug bekommen
-- Lösung: Advisory Lock während Slug-Check
-- ============================================================

CREATE OR REPLACE FUNCTION generate_artist_slug(artist_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
  lock_key BIGINT;
BEGIN
  -- Erstelle Basis-Slug (lowercase, Leerzeichen -> Bindestriche, Sonderzeichen entfernen)
  base_slug := LOWER(TRIM(artist_name));
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
  
  final_slug := base_slug;
  
  -- Advisory Lock: Verhindert Race Condition bei gleichzeitigen Signups
  lock_key := hashtext(base_slug);
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Prüfe Eindeutigkeit (falls Slug schon existiert, füge Zahl hinzu)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE artist_name_slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROBLEM 2: Fehlende Performance-Indizes
-- Symptom: Admin-Queries und Creator-Lookups werden langsam bei >10.000 Profilen
-- Lösung: Composite-Indizes für typische Abfragen
-- ============================================================

-- Admin: "Zeige alle pending applications"
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_visibility 
ON public.profiles(onboarding_status, visibility) 
WHERE onboarding_status IN ('pending', 'submitted');

-- Admin: "Zeige alle approved creators"
CREATE INDEX IF NOT EXISTS idx_profiles_role_visibility 
ON public.profiles(role, visibility) 
WHERE role = 'creator' AND visibility = 'public';

-- Creator-Profil: Songs laden
CREATE INDEX IF NOT EXISTS idx_songs_user_probe 
ON public.songs(user_id, is_probe) 
WHERE is_probe = false; -- Nur Shop-Songs (nicht Bewerbungs-Songs)

-- Admin: Messages Inbox
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread 
ON public.messages(recipient_id, status, created_at DESC) 
WHERE status = 'unread';

-- ============================================================
-- PROBLEM 3: Storage RLS ohne Index
-- Symptom: Storage-Queries werden langsam bei vielen Dateien
-- Lösung: Bucket-Filter-Index (Supabase Storage nutzt storage.objects)
-- ============================================================

-- Hinweis: Supabase Storage nutzt eine interne Tabelle, Indizes werden automatisch verwaltet
-- Falls Performance-Probleme auftreten, kann Supabase Support kontaktiert werden

-- ============================================================
-- PROBLEM 4: Message-Archivierung ohne Partition
-- Symptom: messages-Tabelle wird riesig (>1M Einträge), Queries langsam
-- Lösung: Index für Archiv-Queries + materialized view für Statistiken
-- ============================================================

-- Index für Archivierungs-Job
CREATE INDEX IF NOT EXISTS idx_messages_archivable 
ON public.messages(created_at) 
WHERE archived = false AND deleted_at IS NULL;

-- Materialized View für Admin-Dashboard (schnelle Statistiken)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_admin_stats AS
SELECT
  COUNT(*) FILTER (WHERE onboarding_status = 'submitted') AS pending_applications,
  COUNT(*) FILTER (WHERE role = 'creator' AND visibility = 'public') AS active_creators,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_signups_7d,
  MAX(created_at) AS last_signup
FROM public.profiles;

-- Index für Materialized View Refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_admin_stats_refresh ON mv_admin_stats ((1));

-- Refresh-Funktion (täglich per Cron ausführen)
CREATE OR REPLACE FUNCTION refresh_admin_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PROBLEM 5: Keine Deadlock-Prevention bei Concurrent Updates
-- Symptom: Bei hoher Last können DB-Locks zu Timeouts führen
-- Lösung: Row-Level-Locks mit NOWAIT für non-blocking behavior
-- ============================================================

-- Update Trigger mit Deadlock-Prevention
CREATE OR REPLACE FUNCTION safe_update_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to acquire lock, skip if locked (andere Transaction arbeitet daran)
  IF NOT pg_try_advisory_xact_lock(hashtext('profile:' || NEW.id::text)) THEN
    RAISE NOTICE 'Profile % is locked, skipping slug update', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Normal processing
  IF NEW.artist_name IS NOT NULL AND (NEW.artist_name_slug IS NULL OR OLD.artist_name IS DISTINCT FROM NEW.artist_name) THEN
    NEW.artist_name_slug := generate_artist_slug(NEW.artist_name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger ersetzen (mit Deadlock-Prevention)
DROP TRIGGER IF EXISTS trigger_auto_generate_slug ON public.profiles;
CREATE TRIGGER trigger_auto_generate_slug
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION safe_update_slug();

-- ============================================================
-- PROBLEM 6: Keine Connection Pooling Limits
-- Symptom: Supabase hat Connection-Limits (z.B. 60 für Free Tier, 200 für Pro)
-- Lösung: Connection-Pooling in Next.js + Transaction-Pooling
-- ============================================================

-- Check: Wie viele Connections sind aktuell offen?
SELECT 
  'Connection Check' AS info,
  COUNT(*) AS current_connections,
  current_setting('max_connections')::int AS max_connections,
  ROUND(COUNT(*)::numeric / current_setting('max_connections')::int * 100, 2) AS usage_percent
FROM pg_stat_activity
WHERE datname = current_database();

-- ============================================================
-- PRECHECK: Validierung
-- ============================================================

-- 1. Indizes vorhanden?
SELECT 
  schemaname, 
  tablename, 
  indexname,
  CASE 
    WHEN indexname IN (
      'idx_profiles_onboarding_visibility',
      'idx_profiles_role_visibility',
      'idx_songs_user_probe',
      'idx_messages_recipient_unread',
      'idx_messages_archivable'
    ) THEN '✅ NEU'
    ELSE '⚠️ ALT'
  END AS status
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'songs', 'messages')
ORDER BY tablename, indexname;

-- 2. Slug-Funktion mit Advisory Lock?
SELECT 
  proname AS function_name,
  CASE 
    WHEN prosrc LIKE '%pg_advisory_xact_lock%' THEN '✅ Race-safe'
    ELSE '❌ NICHT race-safe'
  END AS race_condition_status
FROM pg_proc
WHERE proname = 'generate_artist_slug';

-- 3. Materialized View erstellt?
SELECT 
  schemaname,
  matviewname,
  CASE 
    WHEN matviewname = 'mv_admin_stats' THEN '✅ OK'
    ELSE '⚠️'
  END AS status
FROM pg_matviews
WHERE schemaname = 'public';

-- ============================================================
-- MAINTENANCE: Täglich ausführen (via Supabase Edge Function + Cron)
-- ============================================================

-- Job 1: Stats refreshen (täglich 2 Uhr)
-- SELECT cron.schedule('refresh-admin-stats', '0 2 * * *', 'SELECT refresh_admin_stats();');

-- Job 2: Alte Messages archivieren (täglich 3 Uhr)
-- SELECT cron.schedule('archive-old-messages', '0 3 * * *', 'SELECT archive_old_messages(90);');
