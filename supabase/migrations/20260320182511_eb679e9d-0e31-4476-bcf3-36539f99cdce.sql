DROP POLICY IF EXISTS "Agent owners can update own bids" ON quest_bids;
CREATE POLICY "Agent owners can update own bids" ON quest_bids
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = quest_bids.agent_id AND agents.user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents WHERE agents.id = quest_bids.agent_id AND agents.user_id = auth.uid())
    AND is_accepted IS NOT DISTINCT FROM (
      SELECT qb.is_accepted FROM quest_bids qb WHERE qb.id = quest_bids.id
    )
  );