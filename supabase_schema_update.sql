-- 1. Profile-Tabelle erweitern
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS artist_name text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS tech_stack text[], -- Z.B. ['Suno', 'Udio']
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb, -- Z.B. { "spotify": "...", "instagram": "..." }
ADD COLUMN IF NOT EXISTS main_genres text[], -- Z.B. ['Techno', 'Ambient']
ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'pending';

-- 2. Storage Buckets erstellen (für Profilbilder und Songs)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('songs', 'songs', true) ON CONFLICT DO NOTHING;

-- 3. Storage Policies (Sicherheit)
-- JEDER darf Avatars und Songs SEHEN (Public Read)
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public Read Songs" ON storage.objects;
CREATE POLICY "Public Read Songs" ON storage.objects FOR SELECT USING (bucket_id = 'songs');

-- Nur EINGELOGGTE User dürfen hochladen
DROP POLICY IF EXISTS "Auth Upload Avatars" ON storage.objects;
CREATE POLICY "Auth Upload Avatars" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Upload Songs" ON storage.objects;
CREATE POLICY "Auth Upload Songs" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'songs' AND auth.role() = 'authenticated');

-- Updates erlauben (eigenes Bild ändern)
DROP POLICY IF EXISTS "Auth Update Avatars" ON storage.objects;
CREATE POLICY "Auth Update Avatars" ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Auth Update Songs" ON storage.objects;
CREATE POLICY "Auth Update Songs" ON storage.objects FOR UPDATE
USING (bucket_id = 'songs' AND auth.uid() = owner);

-- Löschen erlauben (eigenes Bild löschen)
DROP POLICY IF EXISTS "Auth Delete Avatars" ON storage.objects;
CREATE POLICY "Auth Delete Avatars" ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Auth Delete Songs" ON storage.objects;
CREATE POLICY "Auth Delete Songs" ON storage.objects FOR DELETE
USING (bucket_id = 'songs' AND auth.uid() = owner);

-- 4. SONGS Tabelle erstellen (für die Probe-Songs)
CREATE TABLE IF NOT EXISTS public.songs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  genres text[] DEFAULT '{}', -- Max 3 Genres
  file_url text NOT NULL,
  cover_url text, -- Optionales Cover für den Song
  plays integer DEFAULT 0,
  is_probe boolean DEFAULT false, -- Markiert Probe-Songs
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS für Songs
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Songs Table" ON public.songs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own songs" ON public.songs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own songs" ON public.songs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs" ON public.songs
  FOR DELETE USING (auth.uid() = user_id);
