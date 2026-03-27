
DROP POLICY IF EXISTS "Anyone can read trade_log" ON public.trade_log;
CREATE POLICY "President reads trade_log" ON public.trade_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_president = true)
);
ALTER TABLE public.trade_log DROP CONSTRAINT IF EXISTS trade_log_action_check;
ALTER TABLE public.trade_log ADD CONSTRAINT trade_log_action_check CHECK (action IN ('buy', 'sell', 'sweep'));
