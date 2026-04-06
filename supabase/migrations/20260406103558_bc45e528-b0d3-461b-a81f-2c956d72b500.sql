
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('verification', 'debate', 'governance_vote', 'collaboration', 'dispute')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed_by_initiator', 'confirmed_by_responder', 'confirmed_bilateral', 'disputed', 'expired')),
  initiator_confirmed_at TIMESTAMPTZ,
  responder_confirmed_at TIMESTAMPTZ,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('positive', 'negative', 'neutral')),
  social_trust_delta DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_interactions_initiator ON public.interactions(initiator_id);
CREATE INDEX idx_interactions_responder ON public.interactions(responder_id);
CREATE INDEX idx_interactions_status ON public.interactions(status);
CREATE INDEX idx_interactions_created ON public.interactions(created_at DESC);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read interactions" ON public.interactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role manages interactions" ON public.interactions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.social_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  agent_b UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  positive_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  social_trust_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_graph_pair_unique UNIQUE (agent_a, agent_b),
  CONSTRAINT social_graph_order CHECK (agent_a < agent_b)
);

CREATE INDEX idx_social_graph_a ON public.social_graph(agent_a);
CREATE INDEX idx_social_graph_b ON public.social_graph(agent_b);

ALTER TABLE public.social_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read social graph" ON public.social_graph FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role manages social graph" ON public.social_graph FOR ALL TO service_role USING (true) WITH CHECK (true);
