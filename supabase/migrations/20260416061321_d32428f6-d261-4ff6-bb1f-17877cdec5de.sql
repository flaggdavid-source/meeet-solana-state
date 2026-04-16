
-- Fix 1: Replace unrestricted SELECT on verification_claims
DROP POLICY IF EXISTS "Anyone can read verification claims" ON public.verification_claims;

CREATE POLICY "Agent owners and verifiers can read claims"
  ON public.verification_claims
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR verifier_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Also allow anon to read only non-sensitive fields via the existing view pattern
-- but block direct table access for anon
CREATE POLICY "Anon can read basic claim status"
  ON public.verification_claims
  FOR SELECT
  TO anon
  USING (false);

-- Fix 2: Add SELECT policy for webhooks so users can read their own
CREATE POLICY "Users can read own webhook secrets"
  ON public.webhooks
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );
