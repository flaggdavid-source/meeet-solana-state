import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Check if already checked in today
    const { data: todayLogin } = await serviceClient
      .from("daily_logins")
      .select("*")
      .eq("user_id", user.id)
      .eq("login_date", today)
      .maybeSingle();

    if (todayLogin) {
      return new Response(JSON.stringify({
        alreadyCheckedIn: true,
        streak: todayLogin.streak_count,
        bonus: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get yesterday's streak
    const { data: yesterdayLogin } = await serviceClient
      .from("daily_logins")
      .select("streak_count")
      .eq("user_id", user.id)
      .eq("login_date", yesterday)
      .maybeSingle();

    const prevStreak = yesterdayLogin?.streak_count ?? 0;
    const newStreak = prevStreak + 1;
    const STREAK_BONUSES = [10, 20, 30, 50, 75, 100, 200];
    const bonus = STREAK_BONUSES[Math.min(newStreak - 1, STREAK_BONUSES.length - 1)];

    // Insert with service role (bypasses restrictive RLS)
    const { error: insertError } = await serviceClient.from("daily_logins").insert({
      user_id: user.id,
      login_date: today,
      streak_count: newStreak,
      bonus_meeet: bonus,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ alreadyCheckedIn: true, streak: newStreak, bonus: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw insertError;
    }

    return new Response(JSON.stringify({ alreadyCheckedIn: false, streak: newStreak, bonus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
