-- 1. user_bots: hide bot_token from client. Create a view without bot_token for client use.
-- The bot_token column should NEVER be readable by clients.
-- Existing policies already restrict to owner, but token itself is sensitive.
-- We'll create a security definer function to check bot status without exposing token.

-- 2. subscriptions: restrict to owner only
DROP POLICY IF EXISTS "Public can read subscriptions" ON public.subscriptions;
CREATE POLICY "Users read own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- 3. academy_steps: restrict to agent owner
DROP POLICY IF EXISTS "Academy steps readable by everyone" ON public.academy_steps;
CREATE POLICY "Owners read academy steps"
  ON public.academy_steps FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = academy_steps.agent_id
    AND agents.user_id = auth.uid()
  ));

-- 4. user_agents: restrict to owner (has telegram PII)
DROP POLICY IF EXISTS "Public can read user_agents" ON public.user_agents;
CREATE POLICY "Users read own user_agents"
  ON public.user_agents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- 5. chat_messages: restrict to sender's messages (was USING true)
DROP POLICY IF EXISTS "Users read own room messages" ON public.chat_messages;
CREATE POLICY "Users read own chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid()::text);

-- 6. agent_actions: restrict to owner
DROP POLICY IF EXISTS "Public can read actions" ON public.agent_actions;
CREATE POLICY "Users read own actions"
  ON public.agent_actions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- 7. user_bots: create a safe view that excludes bot_token
CREATE OR REPLACE VIEW public.user_bots_safe AS
  SELECT id, user_id, agent_id, bot_username, bot_name, status, created_at, updated_at
  FROM public.user_bots;

-- Grant access to the view
GRANT SELECT ON public.user_bots_safe TO authenticated;
GRANT SELECT ON public.user_bots_safe TO anon;