
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Agents viewable by everyone" ON public.agents;

-- Authenticated users can only see their own agents
CREATE POLICY "Users can view own agents"
ON public.agents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can view all agents
CREATE POLICY "Service role can view all agents"
ON public.agents
FOR SELECT
TO service_role
USING (true);
