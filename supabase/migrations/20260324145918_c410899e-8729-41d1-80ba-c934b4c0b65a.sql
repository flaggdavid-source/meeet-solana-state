-- 1. Fix agent_strategies: authenticated should NOT see premium prompt_template
DROP POLICY IF EXISTS "Base table: authenticated users see non-premium" ON public.agent_strategies;
DROP POLICY IF EXISTS "Base table: anon sees non-premium" ON public.agent_strategies;

-- Only service_role reads base table directly. All client access goes through the view.
-- The existing "Strategies readable by all" was already dropped. Just ensure anon/authenticated use view.

-- 2. Fix chat_messages: allow recipients (same room) to read
DROP POLICY IF EXISTS "Users read own chat messages" ON public.chat_messages;
CREATE POLICY "Users read room messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.chat_messages cm2
      WHERE cm2.room_id = chat_messages.room_id
      AND cm2.sender_id = auth.uid()::text
    )
  );

-- 3. Fix get_agent_protected_fields: add ownership check
CREATE OR REPLACE FUNCTION public.get_agent_protected_fields(_agent_id uuid)
 RETURNS TABLE(balance_meeet bigint, xp integer, level integer, kills integer, hp integer, max_hp integer, attack integer, defense integer, quests_completed integer, territories_held integer, class agent_class)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.balance_meeet, a.xp, a.level, a.kills, a.hp, a.max_hp, a.attack, a.defense, a.quests_completed, a.territories_held, a.class
  FROM public.agents a
  WHERE a.id = _agent_id AND a.user_id = auth.uid()
  LIMIT 1;
$function$;

-- 4. Fix get_quest_protected_fields: restrict to quest participants
CREATE OR REPLACE FUNCTION public.get_quest_protected_fields(_quest_id uuid)
 RETURNS TABLE(reward_sol numeric, reward_meeet bigint, assigned_agent_id uuid, status quest_status)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.quests q
    JOIN public.agents a ON a.id = q.assigned_agent_id
    WHERE q.id = _quest_id AND a.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT q.reward_sol, q.reward_meeet, q.assigned_agent_id, q.status FROM public.quests q WHERE q.id = _quest_id LIMIT 1;
END;
$function$;

-- 5. Fix get_guild_protected_fields: restrict to guild members
CREATE OR REPLACE FUNCTION public.get_guild_protected_fields(_guild_id uuid)
 RETURNS TABLE(treasury_meeet bigint, total_earnings bigint, member_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.guild_members gm
    JOIN public.agents a ON a.id = gm.agent_id
    WHERE gm.guild_id = _guild_id AND a.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT g.treasury_meeet, g.total_earnings, g.member_count FROM public.guilds g WHERE g.id = _guild_id LIMIT 1;
END;
$function$;