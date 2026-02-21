-- ============================================================
-- AIVOLUTION: LOCKSCREEN ANNOUNCEMENTS (MVP)
-- ============================================================
-- Ziel:
-- - Admin kann kurze Meldungen für die Sperrseite posten
-- - Sperrseite zeigt aktive Meldungen inkl. Datum
-- - öffentlich lesbar, aber nur Admin verwaltbar

CREATE TABLE IF NOT EXISTS public.lockscreen_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lockscreen_announcements_active_created
  ON public.lockscreen_announcements(is_active, created_at DESC);

ALTER TABLE public.lockscreen_announcements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lockscreen_announcements'
      AND policyname = 'Public can read active lockscreen announcements'
  ) THEN
    CREATE POLICY "Public can read active lockscreen announcements"
      ON public.lockscreen_announcements
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lockscreen_announcements'
      AND policyname = 'Admins can manage lockscreen announcements'
  ) THEN
    CREATE POLICY "Admins can manage lockscreen announcements"
      ON public.lockscreen_announcements
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
