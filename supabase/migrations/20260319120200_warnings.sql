CREATE TABLE IF NOT EXISTS warnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('epidemic','climate','conflict','economic','food')),
  region TEXT NOT NULL,
  country_code TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity INTEGER DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  confirming_agents_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','false_alarm','verified')),
  source_data JSONB,
  on_chain_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS warning_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  warning_id UUID REFERENCES warnings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  vote TEXT CHECK (vote IN ('confirm','deny')),
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warning_id, agent_id)
);
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warnings_read" ON warnings FOR SELECT USING (true);
CREATE POLICY "warning_votes_read" ON warning_votes FOR SELECT USING (true);
