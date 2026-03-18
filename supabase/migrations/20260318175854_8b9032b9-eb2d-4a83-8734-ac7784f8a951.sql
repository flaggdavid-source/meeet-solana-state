
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "AI content publicly readable" ON public.ai_generated_content;

-- Only published content is publicly readable
CREATE POLICY "Published AI content readable by all"
ON public.ai_generated_content
FOR SELECT
TO public
USING (is_published = true);

-- Authenticated users can also see their own agent's unpublished content
CREATE POLICY "Owners can view own agent AI content"
ON public.ai_generated_content
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM agents
  WHERE agents.id = ai_generated_content.agent_id
    AND agents.user_id = auth.uid()
));
