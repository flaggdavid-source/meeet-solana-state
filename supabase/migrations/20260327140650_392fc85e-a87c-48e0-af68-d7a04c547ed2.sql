
-- burn_log table
CREATE TABLE IF NOT EXISTS public.burn_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  amount numeric NOT NULL,
  reason text NOT NULL,
  agent_id uuid REFERENCES public.agents(id),
  user_id text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.burn_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read burn_log" ON public.burn_log FOR SELECT USING (true);
CREATE POLICY "Service can insert burn_log" ON public.burn_log FOR INSERT WITH CHECK (true);

-- token_bridge table (future use)
CREATE TABLE IF NOT EXISTS public.token_bridge (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  action text NOT NULL,
  amount numeric NOT NULL,
  fee numeric DEFAULT 0,
  solana_wallet text,
  tx_signature text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.token_bridge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own bridge" ON public.token_bridge FOR SELECT USING (auth.uid()::text = user_id);

-- Add staking tier columns
ALTER TABLE public.agent_stakes ADD COLUMN IF NOT EXISTS tier text DEFAULT 'flex';
ALTER TABLE public.agent_stakes ADD COLUMN IF NOT EXISTS apy numeric DEFAULT 5;
ALTER TABLE public.agent_stakes ADD COLUMN IF NOT EXISTS rewards_claimed numeric DEFAULT 0;

-- Enable realtime for burn_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.burn_log;
