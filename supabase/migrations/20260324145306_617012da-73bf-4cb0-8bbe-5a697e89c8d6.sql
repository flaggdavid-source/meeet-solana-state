-- Fix both views to use security_invoker
ALTER VIEW public.agent_strategies_public SET (security_invoker = on);
ALTER VIEW public.agents_public SET (security_invoker = on);