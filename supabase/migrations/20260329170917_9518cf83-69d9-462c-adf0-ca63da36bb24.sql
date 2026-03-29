CREATE TABLE public.economy_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_supply numeric NOT NULL DEFAULT 1000000000,
  circulating_supply numeric NOT NULL DEFAULT 1000000000,
  total_burned numeric NOT NULL DEFAULT 0,
  total_staked numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.economy_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Economy state readable by everyone" ON public.economy_state FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages economy state" ON public.economy_state FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.economy_state (total_supply, circulating_supply, total_burned, total_staked)
VALUES (1000000000, 1000000000, 0, 0);