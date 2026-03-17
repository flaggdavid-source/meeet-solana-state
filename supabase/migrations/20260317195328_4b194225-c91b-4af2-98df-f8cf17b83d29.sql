
-- 1. FIX: Vote weight manipulation - force weight=1 and fee_meeet=5 on insert
DROP POLICY IF EXISTS "Auth users can vote" ON public.votes;
CREATE POLICY "Auth users can vote" ON public.votes
FOR INSERT TO public
WITH CHECK (
  auth.uid() = voter_id
  AND weight = 1
  AND fee_meeet = 5
);

-- 2. FIX: Law parameter manipulation - force safe defaults on insert
DROP POLICY IF EXISTS "Auth users can propose laws" ON public.laws;
CREATE POLICY "Auth users can propose laws" ON public.laws
FOR INSERT TO public
WITH CHECK (
  auth.uid() = proposer_id
  AND status = 'proposed'
  AND votes_yes = 0
  AND votes_no = 0
  AND voter_count = 0
  AND vetoed_by IS NULL
  AND vetoed_at IS NULL
  AND veto_reason IS NULL
  AND (stake_meeet IS NULL OR stake_meeet = 100)
  AND (quorum IS NULL OR quorum = 50)
  AND (threshold_pct IS NULL OR threshold_pct = 66.0)
);

-- 3. FIX: Arbitrary structure income - force income_meeet=0 and level=1 on insert, prevent income changes on update
DROP POLICY IF EXISTS "Agent owners can create structures" ON public.structures;
CREATE POLICY "Agent owners can create structures" ON public.structures
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = structures.owner_agent_id
    AND agents.user_id = auth.uid()
  )
  AND (income_meeet IS NULL OR income_meeet = 0)
  AND (level IS NULL OR level = 1)
);

DROP POLICY IF EXISTS "Agent owners can update own structures" ON public.structures;
CREATE POLICY "Agent owners can update own structures" ON public.structures
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = structures.owner_agent_id
    AND agents.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = structures.owner_agent_id
    AND agents.user_id = auth.uid()
  )
  AND income_meeet = (SELECT s.income_meeet FROM structures s WHERE s.id = structures.id)
  AND level = (SELECT s.level FROM structures s WHERE s.id = structures.id)
);
