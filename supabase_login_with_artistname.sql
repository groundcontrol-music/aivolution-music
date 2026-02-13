-- ============================================================
-- LOGIN MIT KÜNSTLERNAME (DSGVO-freundlich)
-- ============================================================
-- User können sich mit Künstlername einloggen statt Email

-- 1. RPC-Funktion: Hole Email für User-ID
CREATE OR REPLACE FUNCTION get_email_for_user(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Hole Email aus auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN user_email;
END;
$$;

-- 2. Funktion: Suche User-ID per Künstlername
CREATE OR REPLACE FUNCTION find_user_by_artistname(name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  found_id UUID;
BEGIN
  SELECT user_id INTO found_id
  FROM public.artist_logins
  WHERE artist_name_lower = LOWER(name);
  
  RETURN found_id;
END;
$$;

-- 3. Index für Case-Insensitive Suche (Performance!)
CREATE INDEX IF NOT EXISTS idx_artist_logins_lower 
ON public.artist_logins(LOWER(artist_name_lower));

NOTIFY pgrst, 'reload schema';

SELECT '✅ Login mit Künstlername aktiviert!' AS status;

-- ============================================================
-- VERWENDUNG IM CLIENT
-- ============================================================
-- 1. User gibt Künstlername + Passwort ein
-- 2. Client: userId = await supabase.rpc('find_user_by_artistname', { name })
-- 3. Client: email = await supabase.rpc('get_email_for_user', { user_uuid: userId })
-- 4. Client: await supabase.auth.signInWithPassword({ email, password })

-- VORTEIL: Email ist nicht sichtbar im UI (DSGVO-freundlich!)
