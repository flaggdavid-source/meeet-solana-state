
CREATE TABLE public.verification_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  verifier_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('discovery_accuracy', 'research_quality', 'debate_fairness', 'governance_compliance')),
  target_type TEXT NOT NULL CHECK (target_type IN ('discovery', 'debate', 'governance_proposal')),
  target_id UUID NOT NULL,
  claim_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_progress', 'verified', 'rejected', 'disputed', 'expired')),
  confidence_score DOUBLE PRECISION DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  evidence JSONB DEFAULT '{}'::jsonb,
  veroq_receipt JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days')
);

CREATE INDEX idx_vclaims_agent ON public.verification_claims(agent_id);
CREATE INDEX idx_vclaims_verifier ON public.verification_claims(verifier_id);
CREATE INDEX idx_vclaims_status ON public.verification_claims(verification_status);
CREATE INDEX idx_vclaims_created ON public.verification_claims(created_at DESC);

ALTER TABLE public.verification_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verification claims" ON public.verification_claims FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role manages verification claims" ON public.verification_claims FOR ALL TO service_role USING (true) WITH CHECK (true);
