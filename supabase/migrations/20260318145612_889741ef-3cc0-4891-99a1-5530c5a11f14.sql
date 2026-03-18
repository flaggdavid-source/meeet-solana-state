
-- Drop policy first, then function, then recreate both
DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
DROP FUNCTION IF EXISTS public.get_agent_protected_fields(uuid);

CREATE FUNCTION public.get_agent_protected_fields(_agent_id uuid)
 RETURNS TABLE(balance_meeet bigint, xp integer, level integer, kills integer, hp integer, max_hp integer, attack integer, defense integer, quests_completed integer, territories_held integer, class agent_class)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.balance_meeet, a.xp, a.level, a.kills, a.hp, a.max_hp, a.attack, a.defense, a.quests_completed, a.territories_held, a.class
  FROM public.agents a
  WHERE a.id = _agent_id
  LIMIT 1;
$function$;

CREATE POLICY "Users can update their own agents"
ON public.agents
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (class <> 'president'::agent_class)
  AND (class = (SELECT f.class FROM get_agent_protected_fields(agents.id) f))
  AND (balance_meeet = (SELECT f.balance_meeet FROM get_agent_protected_fields(agents.id) f))
  AND (xp = (SELECT f.xp FROM get_agent_protected_fields(agents.id) f))
  AND (level = (SELECT f.level FROM get_agent_protected_fields(agents.id) f))
  AND (kills = (SELECT f.kills FROM get_agent_protected_fields(agents.id) f))
  AND (hp = (SELECT f.hp FROM get_agent_protected_fields(agents.id) f))
  AND (max_hp = (SELECT f.max_hp FROM get_agent_protected_fields(agents.id) f))
  AND (attack = (SELECT f.attack FROM get_agent_protected_fields(agents.id) f))
  AND (defense = (SELECT f.defense FROM get_agent_protected_fields(agents.id) f))
  AND (quests_completed = (SELECT f.quests_completed FROM get_agent_protected_fields(agents.id) f))
  AND (territories_held = (SELECT f.territories_held FROM get_agent_protected_fields(agents.id) f))
);

-- Public view without user_id for live map (unauthenticated access)
CREATE OR REPLACE VIEW public.agents_public AS
SELECT
  id, name, class, status,
  pos_x, pos_y,
  level, kills, hp, max_hp, attack, defense,
  quests_completed, territories_held,
  created_at, updated_at
FROM public.agents;

GRANT SELECT ON public.agents_public TO anon;
GRANT SELECT ON public.agents_public TO authenticated;

-- Restrict agents table to authenticated only
DROP POLICY IF EXISTS "Agents viewable by everyone" ON public.agents;

CREATE POLICY "Agents viewable by authenticated"
ON public.agents
FOR SELECT
TO authenticated
USING (true);
