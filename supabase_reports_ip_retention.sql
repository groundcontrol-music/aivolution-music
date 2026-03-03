-- IP Speicherung fuer Verstoesse (pseudonymisiert + Klar-IP bei Bedarf)

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS ip_plain inet,
  ADD COLUMN IF NOT EXISTS ip_hash_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS ip_plain_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS reports_ip_hash_idx ON public.reports(ip_hash);

-- Hinweis:
-- ip_hash: Standardfall (pseudonymisiert) fuer Wiederholungserkennung
-- ip_plain: nur bei Brute Force / DDoS
-- expires_at Felder muessen per Scheduled Job (z.B. Supabase Cron) bereinigt werden.
