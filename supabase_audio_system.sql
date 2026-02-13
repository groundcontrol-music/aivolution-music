-- ============================================================
-- AUDIO SYSTEM: WAV (Verkauf) + MP3 Preview (Anhören)
-- ============================================================

-- ============================================================
-- 1. Songs-Tabelle erweitern
-- ============================================================

-- Spalten für WAV (Verkauf) und MP3 (Preview)
ALTER TABLE public.songs 
  ADD COLUMN IF NOT EXISTS wav_url TEXT, -- Original WAV (geschützt, nur Käufer)
  ADD COLUMN IF NOT EXISTS mp3_preview_url TEXT, -- 30 Sek. Preview (öffentlich)
  ADD COLUMN IF NOT EXISTS preview_generated BOOLEAN DEFAULT false;

-- Migration: Existierende file_url → wav_url
UPDATE public.songs 
SET wav_url = file_url
WHERE wav_url IS NULL AND file_url IS NOT NULL;

-- ============================================================
-- 2. Storage Buckets
-- ============================================================

-- WAV-Bucket (PRIVATE - nur für Käufer)
-- Manuell in Supabase Dashboard erstellen:
-- Name: "songs-wav"
-- Public: NO
-- Allowed MIME types: audio/wav, audio/wave, audio/x-wav

-- MP3-Bucket (PUBLIC - für Previews)
-- Manuell in Supabase Dashboard erstellen:
-- Name: "songs-mp3"
-- Public: YES
-- Allowed MIME types: audio/mpeg, audio/mp3

-- ============================================================
-- 3. RLS Policies für WAV (geschützt)
-- ============================================================

-- Creator kann eigene WAVs hochladen
CREATE POLICY "Creators can upload own WAVs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'songs-wav' 
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND get_my_role() = 'creator'
  );

-- Creator kann eigene WAVs lesen
CREATE POLICY "Creators can read own WAVs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'songs-wav' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Käufer können gekaufte WAVs lesen (TODO: nach Purchase-System)
-- CREATE POLICY "Buyers can read purchased WAVs"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'songs-wav' 
--     AND EXISTS (
--       SELECT 1 FROM public.purchases
--       WHERE song_id = ... AND buyer_id = auth.uid()
--     )
--   );

-- Admins können alle WAVs lesen
CREATE POLICY "Admins can read all WAVs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'songs-wav' 
    AND get_my_role() = 'admin'
  );

-- ============================================================
-- 4. RLS Policies für MP3 (öffentlich)
-- ============================================================

-- Jeder kann MP3-Previews lesen (PUBLIC!)
CREATE POLICY "Anyone can read MP3 previews"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'songs-mp3');

-- Nur System/Admin kann MP3s schreiben (generiert via Edge Function)
CREATE POLICY "Only system can write MP3 previews"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'songs-mp3' 
    AND get_my_role() = 'admin'
  );

-- ============================================================
-- 5. Edge Function: MP3-Generierung (bei Freischaltung)
-- ============================================================

-- Diese Funktion wird bei Creator-Approval getriggert
-- Implementierung: Supabase Edge Function mit FFmpeg

/*
PSEUDO-CODE für Edge Function:

1. User wird freigeschaltet (role='creator', onboarding_status='approved')
2. Trigger ruft Edge Function auf
3. Edge Function:
   - Holt alle Songs des Users (WHERE is_probe=false)
   - Für jeden Song:
     a) Download WAV von Storage
     b) FFmpeg: Generiere 30-Sek-Preview als MP3 (128kbps)
     c) Upload MP3 zu songs-mp3 Bucket
     d) Update songs.mp3_preview_url + preview_generated=true
4. Fertig!

DEPENDENCIES:
- FFmpeg (in Edge Function via Layer)
- Supabase Storage Client
*/

-- ============================================================
-- 6. Function: Trigger MP3-Generierung
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_mp3_generation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Wenn Creator freigeschaltet wird
  IF NEW.role = 'creator' AND NEW.onboarding_status = 'approved' 
     AND (OLD.role != 'creator' OR OLD.onboarding_status != 'approved') THEN
    
    -- TODO: Rufe Edge Function auf (via pg_net oder Supabase Functions)
    -- PERFORM net.http_post(
    --   url := 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-mp3-previews',
    --   body := jsonb_build_object('user_id', NEW.id)
    -- );
    
    RAISE NOTICE 'MP3-Generierung getriggert für User %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Bei Profile-Update
DROP TRIGGER IF EXISTS trigger_mp3_generation_on_approval ON public.profiles;
CREATE TRIGGER trigger_mp3_generation_on_approval
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_mp3_generation();

-- ============================================================
-- 7. Stats-Function: Audio-Speicher
-- ============================================================

CREATE OR REPLACE FUNCTION get_audio_storage_stats()
RETURNS TABLE(
  total_songs BIGINT,
  songs_with_wav BIGINT,
  songs_with_mp3 BIGINT,
  wav_storage_mb NUMERIC,
  mp3_storage_mb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_songs,
    COUNT(*) FILTER (WHERE wav_url IS NOT NULL)::BIGINT AS songs_with_wav,
    COUNT(*) FILTER (WHERE mp3_preview_url IS NOT NULL)::BIGINT AS songs_with_mp3,
    ROUND((
      SELECT COALESCE(SUM(size), 0) / 1024.0 / 1024.0 
      FROM storage.objects 
      WHERE bucket_id = 'songs-wav'
    ), 2) AS wav_storage_mb,
    ROUND((
      SELECT COALESCE(SUM(size), 0) / 1024.0 / 1024.0 
      FROM storage.objects 
      WHERE bucket_id = 'songs-mp3'
    ), 2) AS mp3_storage_mb
  FROM public.songs;
END;
$$;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Audio System aktiviert (WAV + MP3 Preview)' AS status;

-- ============================================================
-- NEXT STEPS (Manual)
-- ============================================================

/*
1. STORAGE BUCKETS ERSTELLEN:
   - Supabase Dashboard → Storage → "New Bucket"
   - Bucket 1: "songs-wav" (Private, MIME: audio/wav)
   - Bucket 2: "songs-mp3" (Public, MIME: audio/mpeg)

2. EDGE FUNCTION DEPLOYEN:
   - Code: edge-functions/generate-mp3-previews/index.ts
   - Dependencies: FFmpeg (via Layer)
   - Deploy: supabase functions deploy generate-mp3-previews

3. JOIN-PAGE TESTEN:
   - Creator lädt WAV hoch
   - Admin schaltet frei
   - MP3-Preview wird generiert
   - Player zeigt Song an

4. STATS ABRUFEN:
   SELECT * FROM get_audio_storage_stats();
*/
