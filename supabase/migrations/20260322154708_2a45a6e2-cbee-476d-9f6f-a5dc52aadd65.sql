
CREATE TABLE IF NOT EXISTS public.agent_tweets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  likes integer DEFAULT 0,
  retweets integer DEFAULT 0,
  replies integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_tweets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tweets readable by everyone" ON public.agent_tweets
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role manages tweets" ON public.agent_tweets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Agent owners can create tweets" ON public.agent_tweets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM agents WHERE agents.id = agent_tweets.agent_id AND agents.user_id = auth.uid()
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tweets;
