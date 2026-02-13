-- ============================================================
-- AIVOLUTION MUSIC: SHOP + FORUM + MESSAGES + REPORTS
-- ============================================================

-- 1. SONGS TABLE: Preise hinzufügen
-- ============================================================
ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0;

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_songs_user_price ON public.songs(user_id, price);

-- 2. CREATOR FORUM POSTS (Mini-Forum pro Creator)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.creator_forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.creator_forum_posts(id) ON DELETE CASCADE -- Für verschachtelte Kommentare
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_creator_forum_creator ON public.creator_forum_posts(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_forum_author ON public.creator_forum_posts(author_id);

-- RLS Policies
ALTER TABLE public.creator_forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read creator forum posts"
  ON public.creator_forum_posts FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Logged-in users can create posts"
  ON public.creator_forum_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts"
  ON public.creator_forum_posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Creators can delete posts on their profile"
  ON public.creator_forum_posts FOR UPDATE
  USING (
    auth.uid() = creator_id OR 
    auth.uid() = author_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderation')
  );

-- 3. REPORTS (Meldungen)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_content_type TEXT NOT NULL, -- 'creator_forum_post', 'global_forum_post', 'profile', 'song'
  reported_content_id UUID NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'ignored', 'action_taken'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_content ON public.reports(reported_content_type, reported_content_id);

-- RLS Policies
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderation'));

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'moderation'));

-- 4. MESSAGES (Multi-Type Inbox)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = System Message
  message_type TEXT NOT NULL, -- 'system', 'private', 'forum', 'global'
  subject TEXT,
  content TEXT NOT NULL,
  related_id UUID, -- Optional: z.B. forum_post_id bei type='forum'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);

-- RLS Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can send private messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND message_type = 'private');

CREATE POLICY "System can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id IS NULL AND message_type = 'system');

CREATE POLICY "Users can mark messages as read"
  ON public.messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- 5. GLOBAL FORUM (4 Kategorien)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.global_forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT, -- Optional: Emoji oder Icon-Name
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.global_forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.global_forum_categories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.global_forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.global_forum_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_global_threads_category ON public.global_forum_threads(category_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_replies_thread ON public.global_forum_replies(thread_id, created_at ASC);

-- RLS Policies
ALTER TABLE public.global_forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read forum categories"
  ON public.global_forum_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Everyone can read forum threads"
  ON public.global_forum_threads FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Everyone can read forum replies"
  ON public.global_forum_replies FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Logged-in users can create threads"
  ON public.global_forum_threads FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Logged-in users can reply to threads"
  ON public.global_forum_replies FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own threads"
  ON public.global_forum_threads FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can update own replies"
  ON public.global_forum_replies FOR UPDATE
  USING (auth.uid() = author_id);

-- 6. CART (Warenkorb)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id) -- Verhindert Duplikate
);

-- Index
CREATE INDEX IF NOT EXISTS idx_cart_user ON public.cart_items(user_id);

-- RLS Policies
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. ORDERS (Bestellungen)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id),
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 8. FUNCTIONS: Auto-Increment Reply Count
-- ============================================================
CREATE OR REPLACE FUNCTION increment_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.global_forum_threads
  SET 
    reply_count = reply_count + 1,
    last_activity_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_increment_reply_count ON public.global_forum_replies;
CREATE TRIGGER trigger_increment_reply_count
  AFTER INSERT ON public.global_forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION increment_thread_reply_count();

-- 9. FUNCTIONS: Report Alert (3-Creator-Regel)
-- ============================================================
CREATE OR REPLACE FUNCTION check_report_threshold()
RETURNS TRIGGER AS $$
DECLARE
  creator_count INT;
BEGIN
  -- Zähle, wie viele verschiedene Creator diesen Content gemeldet haben
  SELECT COUNT(DISTINCT r.reporter_id)
  INTO creator_count
  FROM public.reports r
  JOIN public.profiles p ON p.id = r.reporter_id
  WHERE r.reported_content_type = NEW.reported_content_type
    AND r.reported_content_id = NEW.reported_content_id
    AND p.role = 'creator'
    AND r.status = 'pending';

  -- Wenn >= 3 Creator gemeldet haben: Admin-Benachrichtigung
  IF creator_count >= 3 THEN
    INSERT INTO public.messages (recipient_id, message_type, subject, content)
    SELECT 
      id,
      'system',
      '🚨 WARNUNG: 3-Creator-Regel ausgelöst',
      'Content-ID: ' || NEW.reported_content_id || ' (' || NEW.reported_content_type || ') wurde von 3+ Creatorn gemeldet. Bitte prüfen!'
    FROM public.profiles
    WHERE role = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_report_threshold ON public.reports;
CREATE TRIGGER trigger_check_report_threshold
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION check_report_threshold();

-- 10. DEFAULT FORUM CATEGORIES
-- ============================================================
INSERT INTO public.global_forum_categories (name, slug, description, icon, sort_order)
VALUES 
  ('Technik & Tools', 'technik-tools', 'Diskussionen über AI Musik-Tools, DAWs, Workflows', '⚙️', 1),
  ('Kollaborationen', 'kollaborationen', 'Suche/Biete für gemeinsame Projekte', '🤝', 2),
  ('Feedback & Support', 'feedback-support', 'Hilfe zur Plattform, Feature-Wünsche', '💬', 3),
  ('Offtopic', 'offtopic', 'Alles andere: Trends, News, Community', '🌐', 4)
ON CONFLICT (slug) DO NOTHING;

-- Schema Cache neu laden
NOTIFY pgrst, 'reload schema';
