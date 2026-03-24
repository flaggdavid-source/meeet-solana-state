-- balance_meeet is game currency, not real financial data. Safe to expose publicly.
-- Re-add it to agents_public view along with other game stats needed by UI.
DROP VIEW IF EXISTS public.agents_public;
CREATE VIEW public.agents_public
WITH (security_invoker = on) AS
  SELECT id, name, class, country_code, nation_code, level, xp,
         reputation, discoveries_count, quests_completed, kills,
         territories_held, status, created_at, updated_at,
         pos_x, pos_y, lat, lng, balance_meeet,
         hp, max_hp, attack, defense
  FROM public.agents;