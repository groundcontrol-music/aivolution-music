-- ============================================================
-- AIVOLUTION PRECHECK (Ampel-Report)
-- Ziel: Vor jedem Testlauf schnell prüfen, ob Basis sauber ist.
-- Ergebnis: status = OK | WARN
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_precheck_status (
  id BIGSERIAL PRIMARY KEY,
  check_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OK', 'WARN')),
  details TEXT NOT NULL,
  next_step TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_precheck_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read precheck status" ON public.system_precheck_status;
CREATE POLICY "Admins can read precheck status"
  ON public.system_precheck_status FOR SELECT
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admins can insert precheck status" ON public.system_precheck_status;
CREATE POLICY "Admins can insert precheck status"
  ON public.system_precheck_status FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete precheck status" ON public.system_precheck_status;
CREATE POLICY "Admins can delete precheck status"
  ON public.system_precheck_status FOR DELETE
  USING (public.get_my_role() = 'admin');

WITH checks AS (
  -- ------------------------------------------------------------
  -- 1) Kern-Tabellen vorhanden
  -- ------------------------------------------------------------
  SELECT
    'table: public.profiles' AS check_key,
    CASE WHEN to_regclass('public.profiles') IS NOT NULL THEN 'OK' ELSE 'WARN' END AS status,
    'Kernprofil-Tabelle vorhanden' AS details,
    'Fehlt: DB-Migration für profiles ausführen.' AS recommendation
  UNION ALL
  SELECT
    'table: public.songs',
    CASE WHEN to_regclass('public.songs') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Song-Tabelle vorhanden',
    'Fehlt: DB-Migration für songs ausführen.'
  UNION ALL
  SELECT
    'table: public.messages',
    CASE WHEN to_regclass('public.messages') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Message-Tabelle vorhanden',
    'Fehlt: DB-Migration für messages ausführen.'
  UNION ALL
  SELECT
    'table: public.promo_slots',
    CASE WHEN to_regclass('public.promo_slots') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Media-/Template-Slots vorhanden',
    'Fehlt: DB-Migration für promo_slots ausführen.'

  -- ------------------------------------------------------------
  -- 2) Kritische Spalten vorhanden
  -- ------------------------------------------------------------
  UNION ALL
  SELECT
    'column: profiles.visibility',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'visibility'
    ) THEN 'OK' ELSE 'WARN' END,
    'Profile-Sichtbarkeit für Public/Pending/Rejected',
    'ALTER TABLE public.profiles ADD COLUMN visibility TEXT DEFAULT ''pending'';'
  UNION ALL
  SELECT
    'column: profiles.artist_name_slug',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'artist_name_slug'
    ) THEN 'OK' ELSE 'WARN' END,
    'Slug-Spalte für /creator/[slug]',
    'ALTER TABLE public.profiles ADD COLUMN artist_name_slug TEXT;'
  UNION ALL
  SELECT
    'column: songs.wav_url',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'wav_url'
    ) THEN 'OK' ELSE 'WARN' END,
    'WAV-System aktivierbar',
    'ALTER TABLE public.songs ADD COLUMN wav_url TEXT;'
  UNION ALL
  SELECT
    'column: songs.file_url',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'file_url'
    ) THEN 'OK' ELSE 'WARN' END,
    'Legacy-Kompatibilität vorhanden',
    'ALTER TABLE public.songs ADD COLUMN file_url TEXT;'
  UNION ALL
  SELECT
    'column: messages.related_slug',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'related_slug'
    ) THEN 'OK' ELSE 'WARN' END,
    'Direktlink aus Nachricht in Kuration/Profile',
    'ALTER TABLE public.messages ADD COLUMN related_slug TEXT;'

  -- ------------------------------------------------------------
  -- 3) Kritische Funktionen vorhanden
  -- ------------------------------------------------------------
  UNION ALL
  SELECT
    'function: get_my_role()',
    CASE WHEN to_regprocedure('public.get_my_role()') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Admin-/Role-Check via RPC',
    'CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS TEXT ...'
  UNION ALL
  SELECT
    'function: get_email_for_user(uuid)',
    CASE WHEN to_regprocedure('public.get_email_for_user(uuid)') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Email-Ermittlung im Admin-Review',
    'CREATE OR REPLACE FUNCTION public.get_email_for_user(user_uuid uuid) RETURNS TEXT ...'

  -- ------------------------------------------------------------
  -- 4) RLS eingeschaltet auf Kern-Tabellen
  -- ------------------------------------------------------------
  UNION ALL
  SELECT
    'rls-enabled: public.profiles',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'profiles' AND c.relrowsecurity = true
    ) THEN 'OK' ELSE 'WARN' END,
    'RLS aktiv auf profiles',
    'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'
  UNION ALL
  SELECT
    'rls-enabled: public.songs',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'songs' AND c.relrowsecurity = true
    ) THEN 'OK' ELSE 'WARN' END,
    'RLS aktiv auf songs',
    'ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;'
  UNION ALL
  SELECT
    'rls-enabled: public.messages',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'messages' AND c.relrowsecurity = true
    ) THEN 'OK' ELSE 'WARN' END,
    'RLS aktiv auf messages',
    'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;'

  -- ------------------------------------------------------------
  -- 5) Mindest-Policy-Set vorhanden
  --    (nicht auf exakte Namen, sondern auf sinnvolle Mindestanzahl)
  -- ------------------------------------------------------------
  UNION ALL
  SELECT
    'policies: public.profiles (>=3)',
    CASE WHEN (
      SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
    ) >= 3 THEN 'OK' ELSE 'WARN' END,
    'Profiles haben mindestens Read/Insert/Update-Regeln',
    'Policies auf public.profiles prüfen/neu anlegen.'
  UNION ALL
  SELECT
    'policies: public.songs (>=4)',
    CASE WHEN (
      SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'songs'
    ) >= 4 THEN 'OK' ELSE 'WARN' END,
    'Songs haben mindestens Read/Insert/Update/Delete-Regeln',
    'Policies auf public.songs prüfen/neu anlegen.'
  UNION ALL
  SELECT
    'policies: public.messages (>=4)',
    CASE WHEN (
      SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'messages'
    ) >= 4 THEN 'OK' ELSE 'WARN' END,
    'Messages haben mindestens Read/Insert/Update-Regeln',
    'Policies auf public.messages prüfen/neu anlegen.'

  -- ------------------------------------------------------------
  -- 6) Storage-Buckets vorhanden
  -- ------------------------------------------------------------
  UNION ALL
  SELECT
    'bucket: songs-wav',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'songs-wav') THEN 'OK' ELSE 'WARN' END,
    'Privater WAV-Bucket vorhanden',
    'Bucket songs-wav in Supabase Storage anlegen.'
  UNION ALL
  SELECT
    'bucket: songs-mp3',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'songs-mp3') THEN 'OK' ELSE 'WARN' END,
    'MP3-Preview-Bucket vorhanden',
    'Bucket songs-mp3 in Supabase Storage anlegen.'
  UNION ALL
  SELECT
    'bucket: avatars',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN 'OK' ELSE 'WARN' END,
    'Avatar-Bucket vorhanden',
    'Bucket avatars in Supabase Storage anlegen.'
  UNION ALL
  SELECT
    'bucket: media',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'media') THEN 'OK' ELSE 'WARN' END,
    'Media-Bucket für Kommandozentrale vorhanden',
    'Bucket media in Supabase Storage anlegen.'

  -- ------------------------------------------------------------
  -- 7) Storage-Policies grob vorhanden (songs-wav / songs-mp3)
  -- ------------------------------------------------------------
  UNION ALL
  SELECT
    'storage-policies: objects songs-wav',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND (
          qual ILIKE '%songs-wav%'
          OR with_check ILIKE '%songs-wav%'
        )
    ) THEN 'OK' ELSE 'WARN' END,
    'Mind. eine Policy für songs-wav vorhanden',
    'storage.objects Policies für songs-wav ergänzen.'
  UNION ALL
  SELECT
    'storage-policies: objects songs-mp3',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND (
          qual ILIKE '%songs-mp3%'
          OR with_check ILIKE '%songs-mp3%'
        )
    ) THEN 'OK' ELSE 'WARN' END,
    'Mind. eine Policy für songs-mp3 vorhanden',
    'storage.objects Policies für songs-mp3 ergänzen.'
)
SELECT
  check_key,
  status,
  details,
  CASE WHEN status = 'WARN' THEN recommendation ELSE NULL END AS next_step
FROM checks
ORDER BY
  CASE status WHEN 'WARN' THEN 0 ELSE 1 END,
  check_key;

-- ------------------------------------------------------------
-- Kurz-Summary für schnelle Ampel
-- ------------------------------------------------------------
WITH checks AS (
  SELECT
    CASE
      WHEN to_regclass('public.profiles') IS NULL THEN 'WARN'
      WHEN to_regclass('public.songs') IS NULL THEN 'WARN'
      WHEN to_regclass('public.messages') IS NULL THEN 'WARN'
      WHEN to_regprocedure('public.get_my_role()') IS NULL THEN 'WARN'
      ELSE 'OK'
    END AS status
)
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'WARN')
      THEN 'AMPEL: GELB/ROT - Bitte WARN-Zeilen oben beheben'
    ELSE 'AMPEL: GRUEN - Baseline ist vorhanden'
  END AS precheck_summary;

-- ------------------------------------------------------------
-- Persistenz für Kommandozentrale (/admin/kontrolle)
-- ------------------------------------------------------------
WITH checks AS (
  SELECT
    'table: public.profiles' AS check_key,
    CASE WHEN to_regclass('public.profiles') IS NOT NULL THEN 'OK' ELSE 'WARN' END AS status,
    'Kernprofil-Tabelle vorhanden' AS details,
    'Fehlt: DB-Migration für profiles ausführen.' AS recommendation
  UNION ALL
  SELECT
    'table: public.songs',
    CASE WHEN to_regclass('public.songs') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Song-Tabelle vorhanden',
    'Fehlt: DB-Migration für songs ausführen.'
  UNION ALL
  SELECT
    'table: public.messages',
    CASE WHEN to_regclass('public.messages') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Message-Tabelle vorhanden',
    'Fehlt: DB-Migration für messages ausführen.'
  UNION ALL
  SELECT
    'table: public.promo_slots',
    CASE WHEN to_regclass('public.promo_slots') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Media-/Template-Slots vorhanden',
    'Fehlt: DB-Migration für promo_slots ausführen.'
  UNION ALL
  SELECT
    'column: profiles.visibility',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'visibility'
    ) THEN 'OK' ELSE 'WARN' END,
    'Profile-Sichtbarkeit für Public/Pending/Rejected',
    'ALTER TABLE public.profiles ADD COLUMN visibility TEXT DEFAULT ''pending'';'
  UNION ALL
  SELECT
    'column: profiles.artist_name_slug',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'artist_name_slug'
    ) THEN 'OK' ELSE 'WARN' END,
    'Slug-Spalte für /creator/[slug]',
    'ALTER TABLE public.profiles ADD COLUMN artist_name_slug TEXT;'
  UNION ALL
  SELECT
    'column: songs.wav_url',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'wav_url'
    ) THEN 'OK' ELSE 'WARN' END,
    'WAV-System aktivierbar',
    'ALTER TABLE public.songs ADD COLUMN wav_url TEXT;'
  UNION ALL
  SELECT
    'column: songs.file_url',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'file_url'
    ) THEN 'OK' ELSE 'WARN' END,
    'Legacy-Kompatibilität vorhanden',
    'ALTER TABLE public.songs ADD COLUMN file_url TEXT;'
  UNION ALL
  SELECT
    'column: messages.related_slug',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'related_slug'
    ) THEN 'OK' ELSE 'WARN' END,
    'Direktlink aus Nachricht in Kuration/Profile',
    'ALTER TABLE public.messages ADD COLUMN related_slug TEXT;'
  UNION ALL
  SELECT
    'function: get_my_role()',
    CASE WHEN to_regprocedure('public.get_my_role()') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Admin-/Role-Check via RPC',
    'CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS TEXT ...'
  UNION ALL
  SELECT
    'function: get_email_for_user(uuid)',
    CASE WHEN to_regprocedure('public.get_email_for_user(uuid)') IS NOT NULL THEN 'OK' ELSE 'WARN' END,
    'Email-Ermittlung im Admin-Review',
    'CREATE OR REPLACE FUNCTION public.get_email_for_user(user_uuid uuid) RETURNS TEXT ...'
  UNION ALL
  SELECT
    'rls-enabled: public.profiles',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'profiles' AND c.relrowsecurity = true
    ) THEN 'OK' ELSE 'WARN' END,
    'RLS aktiv auf profiles',
    'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'
  UNION ALL
  SELECT
    'rls-enabled: public.songs',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'songs' AND c.relrowsecurity = true
    ) THEN 'OK' ELSE 'WARN' END,
    'RLS aktiv auf songs',
    'ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;'
  UNION ALL
  SELECT
    'rls-enabled: public.messages',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'messages' AND c.relrowsecurity = true
    ) THEN 'OK' ELSE 'WARN' END,
    'RLS aktiv auf messages',
    'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;'
  UNION ALL
  SELECT
    'policies: public.profiles (>=3)',
    CASE WHEN (
      SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
    ) >= 3 THEN 'OK' ELSE 'WARN' END,
    'Profiles haben mindestens Read/Insert/Update-Regeln',
    'Policies auf public.profiles prüfen/neu anlegen.'
  UNION ALL
  SELECT
    'policies: public.songs (>=4)',
    CASE WHEN (
      SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'songs'
    ) >= 4 THEN 'OK' ELSE 'WARN' END,
    'Songs haben mindestens Read/Insert/Update/Delete-Regeln',
    'Policies auf public.songs prüfen/neu anlegen.'
  UNION ALL
  SELECT
    'policies: public.messages (>=4)',
    CASE WHEN (
      SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'messages'
    ) >= 4 THEN 'OK' ELSE 'WARN' END,
    'Messages haben mindestens Read/Insert/Update-Regeln',
    'Policies auf public.messages prüfen/neu anlegen.'
  UNION ALL
  SELECT
    'bucket: songs-wav',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'songs-wav') THEN 'OK' ELSE 'WARN' END,
    'Privater WAV-Bucket vorhanden',
    'Bucket songs-wav in Supabase Storage anlegen.'
  UNION ALL
  SELECT
    'bucket: songs-mp3',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'songs-mp3') THEN 'OK' ELSE 'WARN' END,
    'MP3-Preview-Bucket vorhanden',
    'Bucket songs-mp3 in Supabase Storage anlegen.'
  UNION ALL
  SELECT
    'bucket: avatars',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN 'OK' ELSE 'WARN' END,
    'Avatar-Bucket vorhanden',
    'Bucket avatars in Supabase Storage anlegen.'
  UNION ALL
  SELECT
    'bucket: media',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'media') THEN 'OK' ELSE 'WARN' END,
    'Media-Bucket für Kommandozentrale vorhanden',
    'Bucket media in Supabase Storage anlegen.'
  UNION ALL
  SELECT
    'storage-policies: objects songs-wav',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND (
          qual ILIKE '%songs-wav%'
          OR with_check ILIKE '%songs-wav%'
        )
    ) THEN 'OK' ELSE 'WARN' END,
    'Mind. eine Policy für songs-wav vorhanden',
    'storage.objects Policies für songs-wav ergänzen.'
  UNION ALL
  SELECT
    'storage-policies: objects songs-mp3',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND (
          qual ILIKE '%songs-mp3%'
          OR with_check ILIKE '%songs-mp3%'
        )
    ) THEN 'OK' ELSE 'WARN' END,
    'Mind. eine Policy für songs-mp3 vorhanden',
    'storage.objects Policies für songs-mp3 ergänzen.'
)
, cleared AS (
  DELETE FROM public.system_precheck_status
  WHERE true
  RETURNING 1
)
INSERT INTO public.system_precheck_status (check_key, status, details, next_step, checked_at)
SELECT
  check_key,
  status,
  details,
  CASE WHEN status = 'WARN' THEN recommendation ELSE NULL END AS next_step,
  NOW()
FROM checks;
