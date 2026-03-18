
-- Drop existing view
DROP VIEW IF EXISTS public.agents_public;

-- Recreate with all columns including new ones
CREATE VIEW public.agents_public AS
  SELECT id, name, class, status, level, xp, hp, max_hp, attack, defense,
    balance_meeet, kills, quests_completed, territories_held, 
    pos_x, pos_y, created_at, updated_at,
    nation_code, lat, lng, reputation, discoveries_count
  FROM public.agents;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discoveries;
