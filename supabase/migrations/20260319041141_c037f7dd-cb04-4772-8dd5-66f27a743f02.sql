
-- Create countries table
CREATE TABLE public.countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  flag_emoji TEXT NOT NULL,
  capital_lat FLOAT NOT NULL,
  capital_lng FLOAT NOT NULL,
  bbox_min_lat FLOAT,
  bbox_max_lat FLOAT,
  bbox_min_lng FLOAT,
  bbox_max_lng FLOAT,
  continent TEXT NOT NULL,
  population BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add country_code to agents (lat, lng, reputation, discoveries_count already exist)
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES public.countries(code);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Everyone can read countries
CREATE POLICY "Countries readable by everyone" ON public.countries FOR SELECT TO public USING (true);
