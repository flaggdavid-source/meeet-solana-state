-- Fix: add auth guard to get_trade_protected_fields
CREATE OR REPLACE FUNCTION public.get_trade_protected_fields(_trade_id uuid)
RETURNS TABLE(offer_meeet bigint, request_meeet bigint, from_agent_id uuid, to_agent_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow participants to query trade details
  IF NOT EXISTS (
    SELECT 1 FROM trade_offers t
    JOIN agents a ON (a.id = t.from_agent_id OR a.id = t.to_agent_id)
    WHERE t.id = _trade_id AND a.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT t.offer_meeet, t.request_meeet, t.from_agent_id, t.to_agent_id
    FROM public.trade_offers t
    WHERE t.id = _trade_id
    LIMIT 1;
END;
$$;