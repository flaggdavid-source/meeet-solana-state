CREATE TABLE IF NOT EXISTS agent_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_usdc DECIMAL NOT NULL DEFAULT 0,
  price_meeet INTEGER NOT NULL DEFAULT 0,
  max_agents INTEGER NOT NULL DEFAULT 1,
  compute_tier TEXT NOT NULL DEFAULT 'shared',
  quests_per_day INTEGER NOT NULL DEFAULT 5,
  features JSONB DEFAULT '{}',
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO agent_plans (name, price_usdc, price_meeet, max_agents, compute_tier, quests_per_day, features) VALUES
('Scout', 19, 4750, 1, 'shared', 5, '{"basic_dashboard":true,"email_alerts":true}'),
('Warrior', 49, 11000, 3, 'dedicated', 20, '{"basic_dashboard":true,"email_alerts":true,"webhook_events":true,"strategy_templates":true}'),
('Commander', 149, 32000, 10, 'priority', -1, '{"all_warrior":true,"white_label_api":true,"advanced_analytics":true,"guild_leader":true}'),
('Nation', 499, 100000, 50, 'premium', -1, '{"all":true,"custom_prompts":true,"marketplace_pro":true,"priority_support":true}'),
('Enterprise', 0, 0, -1, 'dedicated_cluster', -1, '{"all":true,"sla":true,"b2g_api":true,"white_label_platform":true}')
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS agent_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  plan_id UUID REFERENCES agent_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  payment_method TEXT CHECK (payment_method IN ('sol','meeet','stripe')),
  amount_paid DECIMAL,
  currency TEXT DEFAULT 'USDC',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS deployed_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES agent_subscriptions(id),
  agent_id UUID REFERENCES agents(id),
  status TEXT DEFAULT 'running' CHECK (status IN ('running','paused','stopped')),
  strategy TEXT DEFAULT 'passive' CHECK (strategy IN ('passive','aggressive','oracle_focus','challenge_focus','compound')),
  custom_prompt TEXT,
  webhook_url TEXT,
  daily_quest_count INTEGER DEFAULT 0,
  total_meeet_earned DECIMAL DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agent_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_usdc DECIMAL DEFAULT 0,
  prompt_template TEXT NOT NULL DEFAULT '',
  target_class TEXT[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  purchases INTEGER DEFAULT 0
);
INSERT INTO agent_strategies (name, description, price_usdc, prompt_template, target_class, is_premium) VALUES
('Passive Income', 'Balanced quest completion, minimal risk', 0, 'Complete easy quests with guaranteed rewards. Focus on daily consistency.', ARRAY['warrior','trader','scout','diplomat','builder','hacker'], false),
('Oracle Master', 'Aggressive prediction betting, 65%+ win rate target', 29.99, 'Analyze GDELT data before placing Oracle bets. Focus on high-confidence predictions.', ARRAY['oracle','scout'], true),
('Global Challenge Hunter', 'Prioritize high-reward Global Challenges', 19.99, 'Always prioritize Global Challenge quests with highest MEEET rewards.', ARRAY['oracle','diplomat','scout'], true),
('Compound Growth', 'Reinvest 80%% of earnings into Oracle bets', 49.99, 'Reinvest 80%% of earnings into Oracle bets. Build compounding position.', ARRAY['trader','banker'], true),
('Diplomat Strategy', 'Focus on peace and diplomacy challenges', 24.99, 'Specialize in peace, diplomacy, and governance challenges.', ARRAY['diplomat'], true)
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS agent_marketplace_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  seller_user_id UUID REFERENCES auth.users,
  price_meeet INTEGER,
  price_sol DECIMAL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','sold','cancelled')),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  amount_usdc DECIMAL,
  amount_sol DECIMAL,
  amount_meeet INTEGER,
  payment_method TEXT,
  lp_contribution_sol DECIMAL,
  treasury_contribution DECIMAL,
  ops_contribution DECIMAL,
  team_contribution DECIMAL,
  tx_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agent_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  earning_type TEXT CHECK (earning_type IN ('quest','oracle_win','challenge','referral')),
  amount_meeet INTEGER NOT NULL DEFAULT 0,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agent_impact (
  agent_id UUID PRIMARY KEY REFERENCES agents(id),
  impact_score INTEGER DEFAULT 0,
  discoveries INTEGER DEFAULT 0,
  warnings_confirmed INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agent_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_impact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON agent_plans FOR SELECT USING (true);
CREATE POLICY "strategies_public_read" ON agent_strategies FOR SELECT USING (true);
CREATE POLICY "marketplace_public_read" ON agent_marketplace_listings FOR SELECT USING (status = 'active');
CREATE POLICY "earnings_public_read" ON agent_earnings FOR SELECT USING (true);
CREATE POLICY "impact_public_read" ON agent_impact FOR SELECT USING (true);
