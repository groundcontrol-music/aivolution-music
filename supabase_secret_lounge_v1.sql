-- ============================================================
-- AIVOLUTION: SECRET LOUNGE v1 (18+ GATE, 3 TOPICS, TEXT ONLY)
-- ============================================================
-- Regelwerk:
-- - Checkbox 18+ reicht NICHT
-- - Zugang nur mit Verifikation:
--   a) Kauf-verifiziert ODER
--   b) Identity-verifiziert ODER
--   c) Compliance-verifiziert (z.B. 30-Alben-Regel)
-- - Gilt auch für Creator/Owner (kein Rollen-Bypass)
-- - Moderation nur für Owner/Admin UND verifiziert

-- ------------------------------------------------------------
-- 1) Tabellen
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_age_verifications (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe_identity',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  provider_ref TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_compliance_verifications (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL DEFAULT 'album_30',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  note TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_lounge_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  age_gate_checkbox BOOLEAN NOT NULL DEFAULT false,
  access_reason TEXT NOT NULL DEFAULT 'none' CHECK (access_reason IN ('none', 'purchase_verified', 'identity_verified', 'compliance_verified')),
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_moderate BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.creator_lounge_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_lounge_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.creator_lounge_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lounge_access_creator_user ON public.creator_lounge_access(creator_id, user_id);
CREATE INDEX IF NOT EXISTS idx_lounge_topics_creator ON public.creator_lounge_topics(creator_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lounge_posts_topic_time ON public.creator_lounge_posts(topic_id, created_at);

-- ------------------------------------------------------------
-- 2) Trigger-Helfer
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_secret_lounge()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_secret_lounge_access_updated_at ON public.creator_lounge_access;
CREATE TRIGGER trg_secret_lounge_access_updated_at
BEFORE UPDATE ON public.creator_lounge_access
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_secret_lounge();

DROP TRIGGER IF EXISTS trg_secret_lounge_topics_updated_at ON public.creator_lounge_topics;
CREATE TRIGGER trg_secret_lounge_topics_updated_at
BEFORE UPDATE ON public.creator_lounge_topics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_secret_lounge();

DROP TRIGGER IF EXISTS trg_secret_lounge_posts_updated_at ON public.creator_lounge_posts;
CREATE TRIGGER trg_secret_lounge_posts_updated_at
BEFORE UPDATE ON public.creator_lounge_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_secret_lounge();

-- Max 3 Themen pro Creator (aktive Themen)
CREATE OR REPLACE FUNCTION public.enforce_lounge_topic_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  topic_count INT;
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO topic_count
  FROM public.creator_lounge_topics t
  WHERE t.creator_id = NEW.creator_id
    AND t.is_active = true
    AND (TG_OP = 'INSERT' OR t.id <> NEW.id);

  IF topic_count >= 3 THEN
    RAISE EXCEPTION 'Maximal 3 aktive Themen pro Secret Lounge erlaubt';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lounge_topic_limit_ins ON public.creator_lounge_topics;
CREATE TRIGGER trg_enforce_lounge_topic_limit_ins
BEFORE INSERT ON public.creator_lounge_topics
FOR EACH ROW EXECUTE FUNCTION public.enforce_lounge_topic_limit();

DROP TRIGGER IF EXISTS trg_enforce_lounge_topic_limit_upd ON public.creator_lounge_topics;
CREATE TRIGGER trg_enforce_lounge_topic_limit_upd
BEFORE UPDATE ON public.creator_lounge_topics
FOR EACH ROW EXECUTE FUNCTION public.enforce_lounge_topic_limit();

-- Textfilter auf Posts anwenden (falls check_content_safety vorhanden)
CREATE OR REPLACE FUNCTION public.validate_lounge_post_content()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  has_filter_fn BOOLEAN;
  content_ok BOOLEAN;
BEGIN
  IF NEW.content IS NULL OR btrim(NEW.content) = '' THEN
    RAISE EXCEPTION 'Leerer Beitrag ist nicht erlaubt';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'check_content_safety'
      AND n.nspname = 'public'
  ) INTO has_filter_fn;

  IF has_filter_fn THEN
    SELECT public.check_content_safety(NEW.content) INTO content_ok;
    IF content_ok IS NOT TRUE THEN
      RAISE EXCEPTION 'Inhalt vom Filter blockiert';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lounge_post_content ON public.creator_lounge_posts;
CREATE TRIGGER trg_validate_lounge_post_content
BEFORE INSERT OR UPDATE ON public.creator_lounge_posts
FOR EACH ROW EXECUTE FUNCTION public.validate_lounge_post_content();

-- ------------------------------------------------------------
-- 3) Access-Logik (ohne Rollen-Bypass)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_secret_lounge_access(
  p_creator_id UUID,
  p_user_id UUID,
  p_checkbox BOOLEAN DEFAULT false
)
RETURNS TABLE (
  access_granted BOOLEAN,
  access_reason TEXT,
  can_write BOOLEAN,
  can_moderate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason TEXT := 'none';
  v_granted BOOLEAN := false;
  v_can_write BOOLEAN := false;
  v_can_moderate BOOLEAN := false;
  v_is_owner BOOLEAN := false;
  v_is_admin BOOLEAN := false;
  v_has_purchase BOOLEAN := false;
  v_has_identity BOOLEAN := false;
  v_has_compliance BOOLEAN := false;
BEGIN
  IF p_creator_id IS NULL OR p_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'none', false, false;
    RETURN;
  END IF;

  v_is_owner := (p_user_id = p_creator_id);
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.role IN ('admin', 'moderation')
  ) INTO v_is_admin;

  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.songs s ON s.id = oi.song_id
    WHERE o.user_id = p_user_id
      AND o.status = 'completed'
      AND s.user_id = p_creator_id
  ) INTO v_has_purchase;

  SELECT EXISTS (
    SELECT 1 FROM public.user_age_verifications v
    WHERE v.user_id = p_user_id
      AND v.status = 'verified'
  ) INTO v_has_identity;

  SELECT EXISTS (
    SELECT 1 FROM public.user_compliance_verifications c
    WHERE c.user_id = p_user_id
      AND c.status = 'verified'
  ) INTO v_has_compliance;

  IF v_has_purchase THEN
    v_reason := 'purchase_verified';
  ELSIF v_has_identity THEN
    v_reason := 'identity_verified';
  ELSIF v_has_compliance THEN
    v_reason := 'compliance_verified';
  END IF;

  v_granted := (v_reason <> 'none');
  v_can_write := v_granted;
  v_can_moderate := v_granted AND (v_is_owner OR v_is_admin);

  INSERT INTO public.creator_lounge_access (
    creator_id, user_id, age_gate_checkbox, access_reason, can_write, can_moderate, granted_at
  )
  VALUES (
    p_creator_id, p_user_id, COALESCE(p_checkbox, false), v_reason, v_can_write, v_can_moderate,
    CASE WHEN v_granted THEN NOW() ELSE NULL END
  )
  ON CONFLICT (creator_id, user_id)
  DO UPDATE SET
    age_gate_checkbox = EXCLUDED.age_gate_checkbox OR public.creator_lounge_access.age_gate_checkbox,
    access_reason = EXCLUDED.access_reason,
    can_write = EXCLUDED.can_write,
    can_moderate = EXCLUDED.can_moderate,
    granted_at = EXCLUDED.granted_at,
    updated_at = NOW();

  RETURN QUERY SELECT v_granted, v_reason, v_can_write, v_can_moderate;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_secret_lounge_access_status(p_creator_id UUID)
RETURNS TABLE (
  access_granted BOOLEAN,
  access_reason TEXT,
  can_write BOOLEAN,
  can_moderate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'none', false, false;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT * FROM public.refresh_secret_lounge_access(p_creator_id, v_uid, false);
END;
$$;

-- ------------------------------------------------------------
-- 4) RLS
-- ------------------------------------------------------------
ALTER TABLE public.creator_lounge_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_lounge_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_lounge_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_lounge_access'
      AND policyname = 'Users can read own lounge access'
  ) THEN
    CREATE POLICY "Users can read own lounge access"
      ON public.creator_lounge_access
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_lounge_topics'
      AND policyname = 'Verified users can read lounge topics'
  ) THEN
    CREATE POLICY "Verified users can read lounge topics"
      ON public.creator_lounge_topics
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.creator_lounge_access a
          WHERE a.creator_id = creator_lounge_topics.creator_id
            AND a.user_id = auth.uid()
            AND a.access_reason <> 'none'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_lounge_topics'
      AND policyname = 'Moderators can manage lounge topics'
  ) THEN
    CREATE POLICY "Moderators can manage lounge topics"
      ON public.creator_lounge_topics
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.creator_lounge_access a
          WHERE a.creator_id = creator_lounge_topics.creator_id
            AND a.user_id = auth.uid()
            AND a.can_moderate = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.creator_lounge_access a
          WHERE a.creator_id = creator_lounge_topics.creator_id
            AND a.user_id = auth.uid()
            AND a.can_moderate = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_lounge_posts'
      AND policyname = 'Verified users can read lounge posts'
  ) THEN
    CREATE POLICY "Verified users can read lounge posts"
      ON public.creator_lounge_posts
      FOR SELECT
      USING (
        is_deleted = false
        AND EXISTS (
          SELECT 1
          FROM public.creator_lounge_access a
          WHERE a.creator_id = creator_lounge_posts.creator_id
            AND a.user_id = auth.uid()
            AND a.access_reason <> 'none'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_lounge_posts'
      AND policyname = 'Verified users can create lounge posts'
  ) THEN
    CREATE POLICY "Verified users can create lounge posts"
      ON public.creator_lounge_posts
      FOR INSERT
      WITH CHECK (
        auth.uid() = author_id
        AND EXISTS (
          SELECT 1
          FROM public.creator_lounge_access a
          WHERE a.creator_id = creator_lounge_posts.creator_id
            AND a.user_id = auth.uid()
            AND a.can_write = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_lounge_posts'
      AND policyname = 'Authors or moderators can soft-delete posts'
  ) THEN
    CREATE POLICY "Authors or moderators can soft-delete posts"
      ON public.creator_lounge_posts
      FOR UPDATE
      USING (
        auth.uid() = author_id
        OR EXISTS (
          SELECT 1
          FROM public.creator_lounge_access a
          WHERE a.creator_id = creator_lounge_posts.creator_id
            AND a.user_id = auth.uid()
            AND a.can_moderate = true
        )
      )
      WITH CHECK (
        auth.uid() = author_id
        OR EXISTS (
          SELECT 1
          FROM public.creator_lounge_access a
          WHERE a.creator_id = creator_lounge_posts.creator_id
            AND a.user_id = auth.uid()
            AND a.can_moderate = true
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5) Rechte
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.refresh_secret_lounge_access(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_secret_lounge_access_status(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
