-- ============================================================
-- DEBUG: Warum werden keine Bewerbungen angezeigt?
-- ============================================================

-- 1. Prüfe: Gibt es Profile mit status = 'submitted'?
SELECT 
  id,
  artist_name,
  onboarding_status,
  role,
  created_at,
  updated_at
FROM public.profiles
WHERE onboarding_status = 'submitted'
ORDER BY updated_at DESC;

-- Erwartung: Sollte mindestens 1 Profil zeigen

-- 2. Prüfe: Gibt es überhaupt Profile (alle Status)?
SELECT 
  onboarding_status,
  role,
  COUNT(*) as anzahl
FROM public.profiles
GROUP BY onboarding_status, role
ORDER BY anzahl DESC;

-- 3. Prüfe: Welche Songs gehören zu welchem Profil?
SELECT 
  s.id,
  s.title,
  s.user_id,
  s.is_probe,
  p.artist_name,
  p.onboarding_status
FROM public.songs s
LEFT JOIN public.profiles p ON s.user_id = p.id
ORDER BY s.created_at DESC
LIMIT 10;

-- 4. Prüfe: Gibt es Messages?
SELECT 
  id,
  recipient_id,
  message_type,
  subject,
  content,
  created_at
FROM public.messages
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================
-- MÖGLICHE URSACHEN
-- ============================================================
-- A) onboarding_status ist NULL oder 'pending' statt 'submitted'
-- B) RLS blockiert den Zugriff (Admin kann Profile nicht lesen)
-- C) Profile existieren, aber ohne Songs
-- D) Trigger/Function hat nicht gefeuert
