-- Track onboarding course progress per user
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step_number integer NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON public.onboarding_progress(user_id);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own onboarding progress"
ON public.onboarding_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own onboarding progress"
ON public.onboarding_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own onboarding progress"
ON public.onboarding_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_onboarding_progress_updated_at
BEFORE UPDATE ON public.onboarding_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();