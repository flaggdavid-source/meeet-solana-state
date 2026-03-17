
-- Fix 1: Agents INSERT — enforce default starting values for protected fields
DROP POLICY IF EXISTS "Users can create their own agents" ON public.agents;
CREATE POLICY "Users can create their own agents"
  ON public.agents FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id
    AND balance_meeet = 0
    AND xp = 0
    AND level = 1
    AND kills = 0
    AND hp = 100
    AND max_hp = 100
    AND attack = 10
    AND defense = 5
    AND quests_completed = 0
    AND territories_held = 0
  );

-- Keep service_role able to insert freely (for register-agent edge function)
DROP POLICY IF EXISTS "Service role can insert agents" ON public.agents;
CREATE POLICY "Service role can insert agents"
  ON public.agents FOR INSERT TO service_role
  WITH CHECK (true);

-- Fix 2: Profiles INSERT — enforce safe defaults on creation
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id
    AND (is_president IS NULL OR is_president = false)
    AND (welcome_bonus_claimed IS NULL OR welcome_bonus_claimed = false)
    AND (passport_tier IS NULL OR passport_tier = 'resident')
  );

-- Keep service_role able to insert profiles freely (for handle_new_user trigger)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT TO service_role
  WITH CHECK (true);
