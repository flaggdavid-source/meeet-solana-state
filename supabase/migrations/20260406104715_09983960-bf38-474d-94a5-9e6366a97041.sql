
-- Add missing columns to api_keys table
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rate_limit integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS daily_limit integer DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Create rate_limit_log table
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  window_type text DEFAULT 'minute'
);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- RLS: service role only for rate_limit_log
CREATE POLICY "Service role access on rate_limit_log"
  ON public.rate_limit_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Index for fast rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_key_window ON public.rate_limit_log (api_key_id, window_type, window_start);
CREATE INDEX IF NOT EXISTS idx_api_keys_agent_id ON public.api_keys (agent_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON public.api_keys (status);
