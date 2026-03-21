ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS owner_tg_id text;

CREATE INDEX IF NOT EXISTS idx_agents_owner_tg_id
ON public.agents (owner_tg_id);