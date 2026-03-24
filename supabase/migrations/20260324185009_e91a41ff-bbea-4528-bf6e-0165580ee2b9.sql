
-- Promo codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  tier text NOT NULL DEFAULT 'pro' CHECK (tier IN ('pro', 'enterprise')),
  duration_days integer NOT NULL DEFAULT 30,
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  discount_pct integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT NULL
);

-- Promo code redemptions
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.promo_codes(id),
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(promo_id, user_id)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Public can read active promo codes (to validate)
CREATE POLICY "Anyone can read active promo codes" ON public.promo_codes
  FOR SELECT USING (is_active = true);

-- Users can see their own redemptions
CREATE POLICY "Users see own redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Insert test promo codes
INSERT INTO public.promo_codes (code, tier, duration_days, max_uses, discount_pct, is_active)
VALUES
  ('MEEET_PRO_TEST', 'pro', 30, 100, 100, true),
  ('MEEET_ENT_TEST', 'enterprise', 30, 50, 100, true),
  ('LAUNCH50', 'pro', 30, 500, 50, true);
