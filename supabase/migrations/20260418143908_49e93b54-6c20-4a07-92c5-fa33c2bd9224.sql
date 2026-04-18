-- Replace permissive service_role policies (linter false-positive but cleanest fix)
DROP POLICY IF EXISTS "academy_modules_service_write" ON public.academy_modules;
DROP POLICY IF EXISTS "academy_progress_service_write" ON public.academy_progress;
DROP POLICY IF EXISTS "academy_certificates_service_write" ON public.academy_certificates;
DROP POLICY IF EXISTS "academy_chat_service_write" ON public.academy_chat_messages;

-- Service role bypasses RLS by default; explicit policies are unnecessary.
-- We keep only owner/public policies. service_role inherits full access.
COMMENT ON TABLE public.academy_modules IS 'Academy module definitions. Read: public. Write: service_role only (bypass RLS).';
COMMENT ON TABLE public.academy_progress IS 'User progress per module. Read/Insert: owner. Update/Delete: service_role only.';
COMMENT ON TABLE public.academy_certificates IS 'Graduation certificates. Read: public (verification). Write: service_role only.';
COMMENT ON TABLE public.academy_chat_messages IS 'AI mentor chat history. Read/Insert: owner.';