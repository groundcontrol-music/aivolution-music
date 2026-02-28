-- ============================================================
-- AIVOLUTION CORE HARDENING V1
-- Fokus: Slug/Flow-Integritaet, Datenleichen-Praevention, Search-Performance
-- Idempotent und produktionstauglich
-- ============================================================

-- 1) Profiles: harte Werte fuer role / onboarding_status
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user',
  ALTER COLUMN onboarding_status SET DEFAULT 'pending';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'creator', 'admin', 'moderation'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_status_check
  CHECK (onboarding_status IN ('pending', 'submitted', 'approved', 'rejected'));

-- 2) Slug-Hardening: lowercase + unique + race-safe Trigger-Basis
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_slug_lowercase_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_slug_lowercase_check
  CHECK (artist_name_slug IS NULL OR artist_name_slug = lower(artist_name_slug));

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_artist_name_slug
  ON public.profiles (artist_name_slug)
  WHERE artist_name_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_artist_slug(artist_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
  lock_key BIGINT;
BEGIN
  base_slug := lower(trim(coalesce(artist_name, 'creator')));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  IF base_slug = '' THEN
    base_slug := 'creator';
  END IF;

  final_slug := base_slug;
  lock_key := hashtext(base_slug);
  PERFORM pg_advisory_xact_lock(lock_key);

  WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE p.artist_name_slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN final_slug;
END;
$$;

-- 3) Songs FK auf profiles(id) + ON DELETE CASCADE
--    verhindert DB-Datenleichen, wenn ein Profil geloescht wird.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS songs_user_id_fkey;
    ALTER TABLE public.songs
      ADD CONSTRAINT songs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;

    BEGIN
      ALTER TABLE public.songs VALIDATE CONSTRAINT songs_user_id_fkey;
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'songs_user_id_fkey konnte nicht validiert werden. Bitte Datenkonsistenz pruefen.';
    END;
  END IF;
END $$;

-- 4) Optional: Albums-FK hardenen (falls Tabelle existiert)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_user_id_fkey;
    ALTER TABLE public.albums
      ADD CONSTRAINT albums_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- 5) Search-Performance: GIN fuer Genre-Felder
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'main_genres'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_main_genres_gin
      ON public.profiles USING gin (main_genres);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'genres'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_songs_genres_gin
      ON public.songs USING gin (genres);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'genre_tags'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_albums_genre_tags_gin
      ON public.albums USING gin (genre_tags);
  END IF;
END $$;

-- 6) Monitoring-Helfer: zeigt grobe Abweichungen sofort
SELECT
  COUNT(*) FILTER (WHERE role NOT IN ('user','creator','admin','moderation')) AS invalid_role_rows,
  COUNT(*) FILTER (WHERE onboarding_status NOT IN ('pending','submitted','approved','rejected')) AS invalid_onboarding_rows,
  COUNT(*) FILTER (WHERE artist_name_slug IS NOT NULL AND artist_name_slug <> lower(artist_name_slug)) AS invalid_slug_rows
FROM public.profiles;
