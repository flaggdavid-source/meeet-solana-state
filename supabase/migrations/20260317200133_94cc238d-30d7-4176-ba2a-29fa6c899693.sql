-- Enable leaked password protection via auth config
-- This is handled via auth settings, not SQL migration
-- Adding service_role INSERT policy for structures to allow backend upgrades
CREATE POLICY "Service role can manage structures"
ON public.structures
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);