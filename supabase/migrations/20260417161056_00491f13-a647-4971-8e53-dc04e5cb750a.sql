-- 1. AUDIT_LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_owner_select" ON public.audit_logs;
CREATE POLICY "audit_logs_owner_select"
ON public.audit_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = audit_logs.agent_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "audit_logs_service_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_service_insert"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = audit_logs.agent_id AND a.user_id = auth.uid()));

-- 2. AGENT_ROLES
ALTER TABLE public.agent_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_roles_owner_select" ON public.agent_roles;
CREATE POLICY "agent_roles_owner_select"
ON public.agent_roles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_roles.agent_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "agent_roles_owner_modify" ON public.agent_roles;
CREATE POLICY "agent_roles_owner_modify"
ON public.agent_roles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_roles.agent_id AND a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_roles.agent_id AND a.user_id = auth.uid()));

-- 3. NEWSLETTER_SUBSCRIBERS — lock down emails + tokens
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_public_select" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_anon_select" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can view subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public read" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Allow public read" ON public.newsletter_subscribers;

DROP POLICY IF EXISTS "newsletter_anon_subscribe" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_anon_subscribe"
ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. REALTIME — drop sensitive tables from public broadcast
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='burn_log') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.burn_log';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='audit_logs') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.audit_logs';
  END IF;
END $$;

-- 5. AGENT_HIRING_PROPOSALS — ownership check
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agent_hiring_proposals') THEN
    EXECUTE 'ALTER TABLE public.agent_hiring_proposals ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "hiring_proposals_owner_insert" ON public.agent_hiring_proposals';
    EXECUTE $p$CREATE POLICY "hiring_proposals_owner_insert"
      ON public.agent_hiring_proposals FOR INSERT TO authenticated
      WITH CHECK (
        proposed_by_agent IS NULL OR
        EXISTS (SELECT 1 FROM public.agents a WHERE a.id = proposed_by_agent AND a.user_id = auth.uid())
      )$p$;
  END IF;
END $$;