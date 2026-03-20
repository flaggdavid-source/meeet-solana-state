
-- Feedback table
CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  feedback_type text NOT NULL DEFAULT 'general',
  rating integer CHECK (rating >= 1 AND rating <= 5),
  message text,
  context_type text,
  context_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own feedback" ON public.user_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages feedback" ON public.user_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Daily login streaks table
CREATE TABLE public.daily_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  login_date date NOT NULL DEFAULT CURRENT_DATE,
  streak_count integer NOT NULL DEFAULT 1,
  bonus_meeet bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, login_date)
);

ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own logins" ON public.daily_logins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own logins" ON public.daily_logins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages logins" ON public.daily_logins FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Promo campaigns table
CREATE TABLE public.promo_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  promo_type text NOT NULL DEFAULT 'bonus',
  bonus_meeet bigint DEFAULT 0,
  discount_pct integer DEFAULT 0,
  max_claims integer,
  current_claims integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promos readable by everyone" ON public.promo_campaigns FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Service role manages promos" ON public.promo_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Promo claims
CREATE TABLE public.promo_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  promo_id uuid REFERENCES public.promo_campaigns(id) ON DELETE CASCADE NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  bonus_received bigint DEFAULT 0,
  UNIQUE(user_id, promo_id)
);

ALTER TABLE public.promo_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own claims" ON public.promo_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own claims" ON public.promo_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages claims" ON public.promo_claims FOR ALL TO service_role USING (true) WITH CHECK (true);
