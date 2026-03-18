
-- Revert: agents must remain publicly readable for live map, hero section, rankings
DROP POLICY IF EXISTS "Agents viewable by authenticated" ON public.agents;

CREATE POLICY "Agents viewable by everyone"
ON public.agents
FOR SELECT
TO public
USING (true);
