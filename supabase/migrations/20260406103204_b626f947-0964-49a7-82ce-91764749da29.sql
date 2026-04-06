
CREATE TABLE public.attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('moltrust', 'veroq', 'manual')),
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('jws', 'json', 'object')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  parsed_claims JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  issuer_did TEXT,
  subject_did TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('valid', 'expired', 'revoked', 'pending_verification'))
);

CREATE INDEX idx_attestations_agent_id ON public.attestations(agent_id);
CREATE INDEX idx_attestations_provider ON public.attestations(provider);
CREATE INDEX idx_attestations_status ON public.attestations(status);

ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read attestations"
  ON public.attestations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages attestations"
  ON public.attestations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
