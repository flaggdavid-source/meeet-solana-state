-- Fix strategies: restrict prompt_template via policy (hide for premium)
DROP POLICY IF EXISTS "View can select strategies" ON public.agent_strategies;
CREATE POLICY "Strategies visible without premium templates"
  ON public.agent_strategies FOR SELECT
  TO authenticated, anon
  USING (NOT is_premium OR prompt_template IS NULL);

-- Fix get_law_protected_fields: add auth check
CREATE OR REPLACE FUNCTION public.get_law_protected_fields(_law_id uuid)
 RETURNS TABLE(status law_status, votes_yes numeric, votes_no numeric, voter_count integer, vetoed_by uuid, vetoed_at timestamp with time zone, veto_reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.laws WHERE id = _law_id AND proposer_id = auth.uid()::text
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT l.status, l.votes_yes, l.votes_no, l.voter_count, l.vetoed_by, l.vetoed_at, l.veto_reason FROM public.laws l WHERE l.id = _law_id LIMIT 1;
END;
$function$;

-- Fix get_quest_protected_fields: handle NULL assigned_agent_id
CREATE OR REPLACE FUNCTION public.get_quest_protected_fields(_quest_id uuid)
 RETURNS TABLE(reward_sol numeric, reward_meeet bigint, assigned_agent_id uuid, status quest_status)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow if user owns the assigned agent OR is the quest requester
  IF NOT EXISTS (
    SELECT 1 FROM public.quests q
    LEFT JOIN public.agents a ON a.id = q.assigned_agent_id
    WHERE q.id = _quest_id AND (a.user_id = auth.uid() OR q.requester_id = auth.uid()::text)
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT q.reward_sol, q.reward_meeet, q.assigned_agent_id, q.status FROM public.quests q WHERE q.id = _quest_id LIMIT 1;
END;
$function$;