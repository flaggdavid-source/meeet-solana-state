
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  preferences JSONB DEFAULT '{"frequency": "weekly"}'::jsonb,
  unsubscribe_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex')
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (true);

-- Public read for subscriber count
CREATE POLICY "Anyone can count subscribers"
ON public.newsletter_subscribers
FOR SELECT
USING (true);

-- Unsubscribe by token
CREATE POLICY "Anyone can unsubscribe with token"
ON public.newsletter_subscribers
FOR UPDATE
USING (true)
WITH CHECK (true);
