
-- Agent channels table
CREATE TABLE public.agent_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  channel_type TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  messages_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for channel_type
CREATE OR REPLACE FUNCTION public.validate_channel_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.channel_type NOT IN ('web_widget', 'telegram', 'whatsapp', 'api', 'email') THEN
    RAISE EXCEPTION 'channel_type must be one of: web_widget, telegram, whatsapp, api, email';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_channel_type
BEFORE INSERT OR UPDATE ON public.agent_channels
FOR EACH ROW EXECUTE FUNCTION public.validate_channel_type();

-- Agent connectors table
CREATE TABLE public.agent_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  connector_type TEXT NOT NULL,
  connector_name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.agent_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_connectors ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read all, but only manage their own (via custom_agents ownership)
CREATE POLICY "Anyone can read channels" ON public.agent_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners manage channels" ON public.agent_channels FOR ALL TO authenticated
  USING (agent_id IN (SELECT id FROM public.custom_agents WHERE creator_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.custom_agents WHERE creator_id = auth.uid()));

CREATE POLICY "Anyone can read connectors" ON public.agent_connectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners manage connectors" ON public.agent_connectors FOR ALL TO authenticated
  USING (agent_id IN (SELECT id FROM public.custom_agents WHERE creator_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.custom_agents WHERE creator_id = auth.uid()));
