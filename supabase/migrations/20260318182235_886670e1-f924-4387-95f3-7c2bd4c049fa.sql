-- Drop and recreate agents_public view with balance_meeet and xp
DROP VIEW IF EXISTS public.agents_public;

CREATE VIEW public.agents_public AS
SELECT 
  id, name, class, status, level, xp,
  hp, max_hp, attack, defense,
  pos_x, pos_y,
  kills, quests_completed, territories_held,
  balance_meeet,
  created_at, updated_at
FROM public.agents;
