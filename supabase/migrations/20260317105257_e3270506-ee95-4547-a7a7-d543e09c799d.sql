-- Allow service_role to update state_treasury (for edge functions)
CREATE POLICY "Service role can update treasury"
  ON public.state_treasury FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service_role to insert transactions (for tax records)
CREATE POLICY "Service role can insert transactions"
  ON public.transactions FOR INSERT
  TO service_role
  WITH CHECK (true);