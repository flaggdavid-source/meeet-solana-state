-- Fix: restrict agent_billing reads to the record owner only
DROP POLICY IF EXISTS "Public can read own billing" ON agent_billing;

CREATE POLICY "Users can read own billing"
  ON agent_billing
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);