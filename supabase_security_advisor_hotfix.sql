-- ============================================================
-- AIVOLUTION: SECURITY ADVISOR HOTFIX
-- ============================================================
-- Fixes:
-- 1) RLS disabled warnings (verification tables)
-- 2) Function search_path mutable warnings
-- 3) optional hardening for materialized view API exposure

-- ------------------------------------------------------------
-- 1) RLS for verification tables
-- ------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_age_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_compliance_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_age_verifications')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename='user_age_verifications' AND policyname='Users can read own age verification'
     )
  THEN
    CREATE POLICY "Users can read own age verification"
      ON public.user_age_verifications
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_compliance_verifications')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename='user_compliance_verifications' AND policyname='Users can read own compliance verification'
     )
  THEN
    CREATE POLICY "Users can read own compliance verification"
      ON public.user_compliance_verifications
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_age_verifications')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename='user_age_verifications' AND policyname='Admins can manage age verifications'
     )
  THEN
    CREATE POLICY "Admins can manage age verifications"
      ON public.user_age_verifications
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_compliance_verifications')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename='user_compliance_verifications' AND policyname='Admins can manage compliance verifications'
     )
  THEN
    CREATE POLICY "Admins can manage compliance verifications"
      ON public.user_compliance_verifications
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) search_path hardening for flagged functions
-- ------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'enforce_lowercase_slug',
        'generate_artist_slug',
        'refresh_admin_stats',
        'safe_update_slug',
        'set_updated_at_secret_lounge',
        'enforce_lounge_topic_limit',
        'validate_lounge_post_content'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path TO public', rec.func_sig);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3) optional hardening for mv_admin_stats warning
-- ------------------------------------------------------------
-- If you DO NOT need direct Data API access on this view:
-- REVOKE ALL ON TABLE public.mv_admin_stats FROM anon, authenticated;
--
-- If admin pages still need it via SQL client, prefer granting only to authenticated admin flow, not anon.

NOTIFY pgrst, 'reload schema';
