CREATE POLICY "Auth users can upsert warning votes"
ON public.warning_votes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents WHERE agents.id = warning_votes.agent_id AND agents.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents WHERE agents.id = warning_votes.agent_id AND agents.user_id = auth.uid()
  )
);