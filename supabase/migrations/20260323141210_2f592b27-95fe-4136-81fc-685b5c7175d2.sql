
CREATE TABLE IF NOT EXISTS public.agent_billing (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  balance_usd numeric NOT NULL DEFAULT 1.00,
  total_spent numeric NOT NULL DEFAULT 0,
  total_charged numeric NOT NULL DEFAULT 0,
  free_credit_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_billing_user_id_idx ON public.agent_billing(user_id);

ALTER TABLE public.agent_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages billing" ON public.agent_billing FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Public can read own billing" ON public.agent_billing FOR SELECT TO public USING (true);

CREATE TABLE IF NOT EXISTS public.agent_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES public.agents(id),
  user_id text NOT NULL,
  action_type text NOT NULL,
  cost_usd numeric DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages actions" ON public.agent_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Public can read actions" ON public.agent_actions FOR SELECT TO public USING (true);
