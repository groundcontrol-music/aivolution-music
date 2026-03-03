-- Song Upload Review / Safety Gate
-- nutzt bestehende content_filters (Badword-Filter)

-- 1) Status-Spalten an songs
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS upload_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS confidence_score int,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 2) Indizes fuer schnelle Filterung in der Kommandozentrale
CREATE INDEX IF NOT EXISTS songs_upload_status_idx ON public.songs(upload_status);
CREATE INDEX IF NOT EXISTS songs_reviewed_by_idx ON public.songs(reviewed_by);

-- 3) Optional: vereinheitlichte Werte (nicht als ENUM, damit leicht erweiterbar)
-- expected values: pending | approved | blocked | needs_review

-- 4) Hinweis:
-- Badword-Check kommt aus public.content_filters (admin editierbar).
-- Meldungen fuer unsichere Uploads laufen ueber public.reports (reported_content_type='song').
