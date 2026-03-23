-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES agents(id),
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'agent')),
  sender_id text NOT NULL,
  message text NOT NULL,
  room_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_agent ON chat_messages(agent_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own room messages" ON chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid()::text);
CREATE POLICY "Service role manages chat" ON chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_bots
CREATE TABLE IF NOT EXISTS public.user_bots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  agent_id uuid REFERENCES agents(id) UNIQUE,
  bot_token text NOT NULL,
  bot_username text,
  bot_name text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own bots" ON user_bots FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "Users insert own bots" ON user_bots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users update own bots" ON user_bots FOR UPDATE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "Service role manages bots" ON user_bots FOR ALL TO service_role USING (true) WITH CHECK (true);

-- usage_logs
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  agent_id uuid,
  action_type text NOT NULL,
  tokens_used integer DEFAULT 0,
  cost_base numeric DEFAULT 0,
  cost_user numeric DEFAULT 0,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id, created_at DESC);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own logs" ON usage_logs FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "Service role manages logs" ON usage_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_balance
CREATE TABLE IF NOT EXISTS public.user_balance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  balance numeric DEFAULT 0,
  total_deposited numeric DEFAULT 0,
  total_spent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own balance" ON user_balance FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "Users insert own balance" ON user_balance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Service role manages balance" ON user_balance FOR ALL TO service_role USING (true) WITH CHECK (true);

-- agent_memories
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES agents(id),
  content text NOT NULL,
  category text DEFAULT 'general',
  importance integer DEFAULT 5,
  keywords text[] DEFAULT '{}',
  recalled_count integer DEFAULT 0,
  last_recalled timestamptz,
  shared_from uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read agent memories" ON agent_memories FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = agent_memories.agent_id AND agents.user_id = auth.uid()));
CREATE POLICY "Service role manages memories" ON agent_memories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- pricing
CREATE TABLE IF NOT EXISTS public.pricing (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text NOT NULL UNIQUE,
  base_cost numeric NOT NULL,
  user_cost numeric NOT NULL,
  description text
);

ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pricing" ON pricing FOR SELECT USING (true);
CREATE POLICY "Service role manages pricing" ON pricing FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;