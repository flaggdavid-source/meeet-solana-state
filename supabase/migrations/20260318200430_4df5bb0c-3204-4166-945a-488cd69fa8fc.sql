
-- Extend agents table with new columns
ALTER TABLE public.agents 
  ADD COLUMN IF NOT EXISTS nation_code VARCHAR(3) REFERENCES public.nations(code),
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS reputation INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discoveries_count INTEGER NOT NULL DEFAULT 0;

-- Extend quests table for Global Challenges
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS is_global_challenge BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS domain VARCHAR(20),
  ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES public.world_events(id),
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;
