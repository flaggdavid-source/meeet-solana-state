
-- Nations table: 195 countries
CREATE TABLE public.nations (
  code VARCHAR(3) PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ru TEXT,
  flag_emoji TEXT NOT NULL DEFAULT '🏳️',
  capital_lat DOUBLE PRECISION,
  capital_lng DOUBLE PRECISION,
  geo_bounds JSONB,
  continent TEXT,
  citizen_count INTEGER NOT NULL DEFAULT 0,
  treasury_meeet BIGINT NOT NULL DEFAULT 0,
  cis_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  ai_doctrine TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nations readable by everyone" ON public.nations
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role manages nations" ON public.nations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- World events table
CREATE TABLE public.world_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  goldstein_scale DOUBLE PRECISION,
  source_url TEXT,
  nation_codes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.world_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "World events readable by everyone" ON public.world_events
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role manages world events" ON public.world_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Discoveries table
CREATE TABLE public.discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID REFERENCES public.quests(id),
  agent_id UUID REFERENCES public.agents(id),
  title TEXT NOT NULL,
  domain VARCHAR(20) NOT NULL DEFAULT 'other',
  synthesis_text TEXT,
  proposed_steps TEXT,
  agents JSONB DEFAULT '[]'::jsonb,
  nations JSONB DEFAULT '[]'::jsonb,
  result_hash TEXT,
  solana_tx TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  impact_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_cited BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved discoveries readable by everyone" ON public.discoveries
  FOR SELECT TO public USING (is_approved = true);

CREATE POLICY "Owners can view own discoveries" ON public.discoveries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = discoveries.agent_id AND agents.user_id = auth.uid()));

CREATE POLICY "Service role manages discoveries" ON public.discoveries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- CIS history
CREATE TABLE public.cis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nation_code VARCHAR(3) REFERENCES public.nations(code),
  cis_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  citizen_count INTEGER NOT NULL DEFAULT 0,
  quests_7d INTEGER NOT NULL DEFAULT 0,
  discoveries_7d INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CIS history readable by everyone" ON public.cis_history
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role manages cis history" ON public.cis_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Nation citizenships
CREATE TABLE public.nation_citizenships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  nation_code VARCHAR(3) NOT NULL REFERENCES public.nations(code),
  tier TEXT NOT NULL DEFAULT 'citizen',
  is_ghost_mode BOOLEAN NOT NULL DEFAULT false,
  ghost_mode_until TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, nation_code)
);

ALTER TABLE public.nation_citizenships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Citizenships readable by everyone" ON public.nation_citizenships
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role manages citizenships" ON public.nation_citizenships
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Agent owners can insert citizenship" ON public.nation_citizenships
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM agents WHERE agents.id = nation_citizenships.agent_id AND agents.user_id = auth.uid()));
