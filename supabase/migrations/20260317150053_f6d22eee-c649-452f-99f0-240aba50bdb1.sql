
DROP POLICY IF EXISTS "Agents viewable by authenticated" ON public.agents;
CREATE POLICY "Agents viewable by everyone"
ON public.agents FOR SELECT
TO public
USING (true);
