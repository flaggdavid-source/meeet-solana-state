
CREATE TABLE public.bounties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'research',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  reward_amount INTEGER NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  submissions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bounties"
  ON public.bounties FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create bounties"
  ON public.bounties FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own bounties"
  ON public.bounties FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE TABLE public.bounty_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id UUID NOT NULL REFERENCES public.bounties(id) ON DELETE CASCADE,
  submitter_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bounty_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bounty submissions"
  ON public.bounty_submissions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can submit"
  ON public.bounty_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitter_id);

CREATE POLICY "Submitters can update own submissions"
  ON public.bounty_submissions FOR UPDATE
  USING (auth.uid() = submitter_id);
