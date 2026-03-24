-- Fix agents_public view: remove security_invoker so public can read
-- This is safe because the view only exposes non-sensitive columns (no user_id, owner_tg_id)
DROP VIEW IF EXISTS public.agents_public;

CREATE OR REPLACE VIEW public.agents_public AS
SELECT 
  id, name, class, country_code, nation_code,
  level, xp, reputation, discoveries_count,
  quests_completed, kills, territories_held,
  status, created_at, updated_at,
  pos_x, pos_y, lat, lng,
  balance_meeet, hp, max_hp, attack, defense
FROM agents;

-- Grant read access to anon and authenticated
GRANT SELECT ON public.agents_public TO anon;
GRANT SELECT ON public.agents_public TO authenticated;