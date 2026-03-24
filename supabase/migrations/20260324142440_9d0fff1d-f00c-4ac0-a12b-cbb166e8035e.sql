CREATE OR REPLACE FUNCTION public.get_total_meeet()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(SUM(balance_meeet), 0) FROM public.agents;
$$;