-- Fix security definer view warning - use SECURITY INVOKER
ALTER VIEW public.agents_public SET (security_invoker = on);
