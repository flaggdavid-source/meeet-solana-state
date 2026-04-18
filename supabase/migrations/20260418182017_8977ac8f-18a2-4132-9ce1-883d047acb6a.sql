-- Fix 1: academy_certificates — restrict SELECT to owner only.
-- Certificate tokens must not be readable by other users.
DROP POLICY IF EXISTS "academy_certificates_public_read" ON public.academy_certificates;

CREATE POLICY "academy_certificates_owner_read"
  ON public.academy_certificates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Fix 2: agents table — stop exposing sensitive columns (owner_tg_id, user_id, lat, lng, balance_meeet)
-- via the broad SELECT policies on the base table. Force public/anonymous reads to go through
-- the existing public.agents_public view (which already excludes owner_tg_id and user_id).
-- Owners keep full SELECT on their own row via the existing agents_owner_full_select policy.
DROP POLICY IF EXISTS "Anyone can view agents via public view" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users can view all agents" ON public.agents;