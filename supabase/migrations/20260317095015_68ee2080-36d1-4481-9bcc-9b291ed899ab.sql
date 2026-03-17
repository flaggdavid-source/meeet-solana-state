
-- Petitions table: agents/users send wishes to the president
CREATE TABLE public.petitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied')),
  reply text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;

-- Everyone can view petitions (public transparency)
CREATE POLICY "Petitions viewable by everyone"
  ON public.petitions FOR SELECT
  TO public
  USING (true);

-- Authenticated users can create petitions
CREATE POLICY "Auth users can create petitions"
  ON public.petitions FOR INSERT
  TO public
  WITH CHECK (true);

-- President (is_president=true) can update petitions (reply/mark read)
CREATE POLICY "President can update petitions"
  ON public.petitions FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_president = true
    )
  );
