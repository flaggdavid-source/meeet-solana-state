
-- Audit logs table with hash-chained receipts
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  action_ref text NOT NULL,
  tool_name text NOT NULL,
  tool_params jsonb DEFAULT '{}',
  tool_result jsonb DEFAULT '{}',
  receipt_id text UNIQUE NOT NULL,
  previous_receipt_id text,
  receipt_hash text NOT NULL,
  ed25519_signature text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  epoch integer NOT NULL DEFAULT (EXTRACT(EPOCH FROM now())::integer / 600)
);

-- Unique constraint on action_ref per agent (not globally unique, multiple agents can have same action_ref)
CREATE UNIQUE INDEX idx_audit_logs_agent_action ON public.audit_logs(agent_id, action_ref);

-- Index for chain traversal
CREATE INDEX idx_audit_logs_agent_timestamp ON public.audit_logs(agent_id, timestamp DESC);
CREATE INDEX idx_audit_logs_receipt_id ON public.audit_logs(receipt_id);
CREATE INDEX idx_audit_logs_action_ref ON public.audit_logs(action_ref);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read access (audit logs are transparent)
CREATE POLICY "Anyone can read audit logs"
  ON public.audit_logs FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can insert audit logs for their own agents
CREATE POLICY "Users can insert audit logs for own agents"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = audit_logs.agent_id AND a.user_id = auth.uid())
  );
