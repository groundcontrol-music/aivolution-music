-- ============================================================
-- PROMO_SLOTS: TikTok-Video-Support
-- ============================================================

ALTER TABLE public.promo_slots 
ADD COLUMN IF NOT EXISTS tiktok_id TEXT;

NOTIFY pgrst, 'reload schema';
