
-- Recreate agents_public view WITHOUT security_invoker so anon users can read it
DROP VIEW IF EXISTS public.agents_public;

CREATE VIEW public.agents_public AS
  SELECT
    id, name, class, level, xp, hp, max_hp, attack, defense,
    balance_meeet, status, reputation, kills,
    quests_completed, discoveries_count, territories_held,
    pos_x, pos_y, lat, lng,
    nation_code, country_code,
    created_at, updated_at
  FROM public.agents;

-- Grant SELECT to anon and authenticated
GRANT SELECT ON public.agents_public TO anon;
GRANT SELECT ON public.agents_public TO authenticated;
