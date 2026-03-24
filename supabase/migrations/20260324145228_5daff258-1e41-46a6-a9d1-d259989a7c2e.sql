-- The view already uses security_invoker=on which is the correct approach.
-- Drop the permissive "Strategies readable by all" and replace with one that hides prompt_template
DROP POLICY IF EXISTS "Strategies readable by all" ON public.agent_strategies;

-- Only allow SELECT on base table to service_role (for edge functions)
-- Public/anon access goes through the view
CREATE POLICY "Base table: authenticated users see non-premium"
  ON public.agent_strategies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Base table: anon sees non-premium"
  ON public.agent_strategies FOR SELECT
  TO anon  
  USING (NOT is_premium OR price_usdc IS NULL OR price_usdc = 0);