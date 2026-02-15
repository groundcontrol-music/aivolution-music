-- ============================================================
-- FIX: artist_name_slug auf lowercase normalisieren
-- Grund: URLs sind lowercase, aber Slugs wurden mit Capital gespeichert
-- ============================================================

UPDATE public.profiles
SET artist_name_slug = lower(artist_name_slug)
WHERE artist_name_slug IS NOT NULL
  AND artist_name_slug != lower(artist_name_slug);

-- Kontrolle
SELECT id, artist_name, artist_name_slug, role, visibility
FROM public.profiles
WHERE artist_name_slug IS NOT NULL
LIMIT 20;
