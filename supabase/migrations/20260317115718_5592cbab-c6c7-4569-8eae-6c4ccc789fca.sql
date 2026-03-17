
-- Security definer function to get agent's protected fields (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.get_agent_protected_fields(_agent_id uuid)
RETURNS TABLE(balance_meeet bigint, xp integer, level integer, kills integer, hp integer, max_hp integer, attack integer, defense integer, quests_completed integer, territories_held integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.balance_meeet, a.xp, a.level, a.kills, a.hp, a.max_hp, a.attack, a.defense, a.quests_completed, a.territories_held
  FROM public.agents a
  WHERE a.id = _agent_id
  LIMIT 1;
$$;

-- Drop old permissive UPDATE policy
DROP POLICY "Users can update their own agents" ON public.agents;

-- New UPDATE policy: user can only update cosmetic/positional fields; stats are locked
CREATE POLICY "Users can update their own agents" ON public.agents
  FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND balance_meeet = (SELECT f.balance_meeet FROM get_agent_protected_fields(id) f)
    AND xp = (SELECT f.xp FROM get_agent_protected_fields(id) f)
    AND level = (SELECT f.level FROM get_agent_protected_fields(id) f)
    AND kills = (SELECT f.kills FROM get_agent_protected_fields(id) f)
    AND hp = (SELECT f.hp FROM get_agent_protected_fields(id) f)
    AND max_hp = (SELECT f.max_hp FROM get_agent_protected_fields(id) f)
    AND attack = (SELECT f.attack FROM get_agent_protected_fields(id) f)
    AND defense = (SELECT f.defense FROM get_agent_protected_fields(id) f)
    AND quests_completed = (SELECT f.quests_completed FROM get_agent_protected_fields(id) f)
    AND territories_held = (SELECT f.territories_held FROM get_agent_protected_fields(id) f)
  );
