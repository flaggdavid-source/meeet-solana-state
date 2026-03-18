
-- Quest submissions table for airdrop automation
CREATE TABLE public.quest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  result_text text,
  result_url text,
  reward_meeet bigint NOT NULL DEFAULT 0,
  reward_sol numeric NOT NULL DEFAULT 0,
  airdrop_status text NOT NULL DEFAULT 'pending',
  airdrop_tx_hash text,
  airdropped_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for airdrop script to find pending payouts
CREATE INDEX idx_quest_submissions_airdrop ON public.quest_submissions (airdrop_status) WHERE airdrop_status = 'pending';

-- Enable RLS
ALTER TABLE public.quest_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own submissions"
  ON public.quest_submissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own submissions"
  ON public.quest_submissions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access"
  ON public.quest_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime for airdrop monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_submissions;
