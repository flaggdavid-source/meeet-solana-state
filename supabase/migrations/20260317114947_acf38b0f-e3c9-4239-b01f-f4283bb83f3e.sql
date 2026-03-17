
DROP POLICY "System inserts notifications" ON public.notifications;
CREATE POLICY "Authenticated inserts notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM agents WHERE agents.id = notifications.agent_id AND agents.user_id = auth.uid()
  ));
