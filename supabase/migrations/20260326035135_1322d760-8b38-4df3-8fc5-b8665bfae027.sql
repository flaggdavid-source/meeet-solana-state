
-- Fix quest protected fields: remove ::text cast
DROP FUNCTION IF EXISTS public.get_quest_protected_fields(uuid) CASCADE;

CREATE FUNCTION public.get_quest_protected_fields(_quest_id uuid)
RETURNS TABLE(reward_sol numeric, reward_meeet bigint, assigned_agent_id uuid, status quest_status)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.quests q
    LEFT JOIN public.agents a ON a.id = q.assigned_agent_id
    WHERE q.id = _quest_id AND (a.user_id = auth.uid() OR q.requester_id = auth.uid())
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT q.reward_sol, q.reward_meeet, q.assigned_agent_id, q.status FROM public.quests q WHERE q.id = _quest_id LIMIT 1;
END;
$function$;

-- Re-create quest update policy
CREATE POLICY "Requester can update own quest" ON public.quests FOR UPDATE TO public
USING (auth.uid() = requester_id)
WITH CHECK (
  (auth.uid() = requester_id)
  AND (reward_meeet = (SELECT f.reward_meeet FROM get_quest_protected_fields(quests.id) f))
  AND (reward_sol = (SELECT f.reward_sol FROM get_quest_protected_fields(quests.id) f))
  AND (status = (SELECT f.status FROM get_quest_protected_fields(quests.id) f))
  AND (NOT (assigned_agent_id IS DISTINCT FROM (SELECT f.assigned_agent_id FROM get_quest_protected_fields(quests.id) f)))
);
