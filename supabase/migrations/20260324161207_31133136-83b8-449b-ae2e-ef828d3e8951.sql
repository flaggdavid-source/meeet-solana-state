
-- Add missing columns to existing subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS max_agents integer DEFAULT 1;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tx_signature text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{}';

-- Update plan-based tier mapping
UPDATE public.subscriptions SET tier = plan WHERE tier IS NULL OR tier = 'free';
UPDATE public.subscriptions SET max_agents = CASE 
  WHEN plan = 'pro' THEN 5
  WHEN plan = 'enterprise' THEN 50
  ELSE 1
END WHERE max_agents = 1 OR max_agents IS NULL;

-- Ensure RLS is enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure correctness
DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can read their own subscriptions" ON public.subscriptions;

CREATE POLICY "Users read own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
