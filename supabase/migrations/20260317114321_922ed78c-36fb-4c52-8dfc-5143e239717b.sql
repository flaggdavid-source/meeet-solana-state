
-- 1. Agent Messages (chat between agents)
CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  to_agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'direct', -- 'direct', 'global', 'guild'
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_messages_channel ON public.agent_messages(channel, created_at DESC);
CREATE INDEX idx_agent_messages_to ON public.agent_messages(to_agent_id, created_at DESC);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- Global messages readable by all authenticated, direct only by participants
CREATE POLICY "Read own or global messages" ON public.agent_messages
  FOR SELECT TO authenticated
  USING (
    channel = 'global'
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = agent_messages.from_agent_id AND agents.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = agent_messages.to_agent_id AND agents.user_id = auth.uid())
  );

CREATE POLICY "Send messages from own agent" ON public.agent_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents WHERE agents.id = agent_messages.from_agent_id AND agents.user_id = auth.uid())
    AND length(content) BETWEEN 1 AND 500
  );

-- 2. Trade Offers
CREATE TYPE public.trade_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'expired');

CREATE TABLE public.trade_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  to_agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  offer_meeet bigint NOT NULL DEFAULT 0,
  request_meeet bigint NOT NULL DEFAULT 0,
  message text,
  status public.trade_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_offers_status ON public.trade_offers(status, created_at DESC);

ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view trades" ON public.trade_offers
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents WHERE agents.id = trade_offers.from_agent_id AND agents.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = trade_offers.to_agent_id AND agents.user_id = auth.uid())
  );

CREATE POLICY "Create trade from own agent" ON public.trade_offers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents WHERE agents.id = trade_offers.from_agent_id AND agents.user_id = auth.uid())
  );

CREATE POLICY "Participants can update trades" ON public.trade_offers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents WHERE agents.id = trade_offers.from_agent_id AND agents.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = trade_offers.to_agent_id AND agents.user_id = auth.uid())
  );

-- 3. Alliances
CREATE TYPE public.alliance_status AS ENUM ('proposed', 'active', 'broken', 'expired');

CREATE TABLE public.alliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  agent_b_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  alliance_type text NOT NULL DEFAULT 'pact', -- 'pact', 'trade_partner', 'war_ally'
  status public.alliance_status NOT NULL DEFAULT 'proposed',
  proposed_by uuid NOT NULL REFERENCES public.agents(id),
  message text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_alliance CHECK (agent_a_id <> agent_b_id)
);

ALTER TABLE public.alliances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view alliances" ON public.alliances
  FOR SELECT TO authenticated
  USING (true); -- Alliances are public knowledge

CREATE POLICY "Create alliance from own agent" ON public.alliances
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM agents WHERE agents.id = alliances.proposed_by AND agents.user_id = auth.uid())
  );

CREATE POLICY "Participants can update alliances" ON public.alliances
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents WHERE agents.id = alliances.agent_a_id AND agents.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = alliances.agent_b_id AND agents.user_id = auth.uid())
  );

-- 4. Activity Feed
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  target_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'duel_win', 'quest_complete', 'trade', 'alliance', 'level_up', 'territory_claim'
  title text NOT NULL,
  description text,
  meeet_amount bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_feed_created ON public.activity_feed(created_at DESC);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feed readable by all authenticated" ON public.activity_feed
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role inserts feed" ON public.activity_feed
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 5. Enable realtime for social tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alliances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
