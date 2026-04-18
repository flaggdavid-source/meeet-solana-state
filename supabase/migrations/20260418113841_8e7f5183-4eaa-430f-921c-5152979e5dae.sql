
-- 1) exchange_records: убрать публичный read и неограниченный insert
DROP POLICY IF EXISTS "exchange_records_read" ON public.exchange_records;
DROP POLICY IF EXISTS "exchange_records_insert" ON public.exchange_records;

-- Только сервис-роль может читать/писать (edge functions используют service role)
CREATE POLICY "exchange_records_service_only_select"
  ON public.exchange_records FOR SELECT
  TO authenticated
  USING (false);

-- 2) season_scores: убрать дублирующие пермиссивные политики
DROP POLICY IF EXISTS "Users can insert own season scores" ON public.season_scores;
DROP POLICY IF EXISTS "Users can update own season scores" ON public.season_scores;

-- 3) agent_roles: убрать публичный read
DROP POLICY IF EXISTS "agent_roles_read" ON public.agent_roles;

-- 4) Realtime: ограничить подписку на каналы
-- Удаляем общие "true" политики, если есть
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read access" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated write access" ON realtime.messages';
  END IF;
END $$;

-- DM каналы: формат dm_<uuidA>_<uuidB> — только участники
CREATE POLICY "Realtime DM channels: participants only"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'dm_%' THEN
        position(auth.uid()::text in realtime.topic()) > 0
      WHEN realtime.topic() LIKE 'guild_%' THEN
        EXISTS (
          SELECT 1 FROM public.guild_members gm
          JOIN public.agents a ON a.id = gm.agent_id
          WHERE a.user_id = auth.uid()
            AND gm.guild_id::text = replace(realtime.topic(), 'guild_', '')
        )
      ELSE
        true  -- публичные каналы (activity, world events) разрешены
    END
  );

CREATE POLICY "Realtime DM channels: participants can send"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE
      WHEN realtime.topic() LIKE 'dm_%' THEN
        position(auth.uid()::text in realtime.topic()) > 0
      WHEN realtime.topic() LIKE 'guild_%' THEN
        EXISTS (
          SELECT 1 FROM public.guild_members gm
          JOIN public.agents a ON a.id = gm.agent_id
          WHERE a.user_id = auth.uid()
            AND gm.guild_id::text = replace(realtime.topic(), 'guild_', '')
        )
      ELSE
        true
    END
  );
