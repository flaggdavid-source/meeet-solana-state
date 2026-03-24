CREATE TABLE IF NOT EXISTS public.token_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_usd numeric NOT NULL DEFAULT 0,
  price_sol numeric NOT NULL DEFAULT 0,
  market_cap numeric DEFAULT 0,
  volume_24h numeric DEFAULT 0,
  liquidity_usd numeric DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read token prices"
  ON public.token_price_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_token_price_recorded ON public.token_price_history (recorded_at DESC);