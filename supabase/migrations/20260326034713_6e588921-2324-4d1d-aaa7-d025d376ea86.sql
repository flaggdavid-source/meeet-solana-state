-- Fix security: Add strict user-scoped SELECT policy to user_bots
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_bots' AND policyname = 'Users can read own bots'
  ) THEN
    CREATE POLICY "Users can read own bots" ON public.user_bots
      FOR SELECT TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- Fix profiles INSERT: restrict to authenticated only
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    DROP POLICY "Users can insert own profile" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix promo_codes: restrict to authenticated users
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'promo_codes' AND policyname = 'Active codes are public'
  ) THEN
    DROP POLICY "Active codes are public" ON public.promo_codes;
    CREATE POLICY "Active codes visible to authenticated" ON public.promo_codes
      FOR SELECT TO authenticated
      USING (is_active = true AND (used_count < max_uses OR max_uses = 0));
  END IF;
END $$;