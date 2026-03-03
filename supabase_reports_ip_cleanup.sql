-- Cleanup Job: IP Daten nach Ablauf entfernen (14 Tage)
-- Voraussetzung: pg_cron Extension aktiv

-- 1) Cron Extension aktivieren (falls noch nicht aktiv)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Cleanup Function
CREATE OR REPLACE FUNCTION public.cleanup_report_ips()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.reports
  SET
    ip_hash = NULL,
    ip_hash_expires_at = NULL
  WHERE ip_hash_expires_at IS NOT NULL
    AND ip_hash_expires_at <= now();

  UPDATE public.reports
  SET
    ip_plain = NULL,
    ip_plain_expires_at = NULL
  WHERE ip_plain_expires_at IS NOT NULL
    AND ip_plain_expires_at <= now();
END;
$$;

-- 3) Job anlegen (taeglich um 03:15)
SELECT cron.schedule(
  'cleanup_report_ips_daily',
  '15 3 * * *',
  $$SELECT public.cleanup_report_ips();$$
);
