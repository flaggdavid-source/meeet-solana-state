
ALTER TABLE public.agent_marketplace_listings 
  ADD COLUMN IF NOT EXISTS buyer_id uuid,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
