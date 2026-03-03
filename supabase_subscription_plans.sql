-- Subscription plans + profile link (Abo Modelle)

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_number int NOT NULL UNIQUE,
  name text NOT NULL,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  storage_gb int NOT NULL DEFAULT 0,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Public read (for plan selection)
CREATE POLICY IF NOT EXISTS "subscription_plans_read" ON public.subscription_plans
FOR SELECT USING (true);

-- Admin write
CREATE POLICY IF NOT EXISTS "subscription_plans_admin_write" ON public.subscription_plans
FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Link plan to profiles (creator selects plan)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan_id uuid REFERENCES public.subscription_plans(id);

CREATE INDEX IF NOT EXISTS profiles_subscription_plan_id_idx
  ON public.profiles(subscription_plan_id);

-- Allow users to update their own plan selection
CREATE POLICY IF NOT EXISTS "profiles_update_own_plan" ON public.profiles
FOR UPDATE USING (auth.uid() = id);
