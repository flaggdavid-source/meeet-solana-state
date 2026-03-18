-- Fix #3: Allow authenticated users to read all agents (not just their own)
CREATE POLICY "Authenticated can read all agents"
ON public.agents
FOR SELECT
TO authenticated
USING (true);

-- Note: "Users can view own agents" policy already exists but is too restrictive.
-- This new policy allows all authenticated users to see all agents (public leaderboard data).
-- The agents_public view already strips user_id for privacy.