import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, ref_code, user_id } = await req.json();

    // Validate referral code
    if (action === "validate") {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("referral_code", ref_code)
        .maybeSingle();

      return new Response(
        JSON.stringify({ valid: !!data, referrer: data ? { display_name: data.display_name, avatar_url: data.avatar_url } : null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get referral stats for a user
    if (action === "stats" && user_id) {
      const { data: referrals } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_user_id", user_id);

      const total = referrals?.length ?? 0;
      const active = referrals?.filter((r: any) => r.status !== "pending").length ?? 0;
      const earned = referrals?.reduce((s: number, r: any) => s + Number(r.total_earned_meeet || 0), 0) ?? 0;

      return new Response(
        JSON.stringify({ total, active, total_earned_meeet: earned }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record a referral on signup
    if (action === "record" && ref_code && user_id) {
      // Find referrer
      const { data: referrer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", ref_code)
        .maybeSingle();

      if (!referrer || referrer.user_id === user_id) {
        return new Response(
          JSON.stringify({ ok: false, error: "Invalid referral" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check duplicate
      const { data: existing } = await supabase
        .from("referrals")
        .select("id")
        .eq("referred_user_id", user_id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ ok: true, message: "Already recorded" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert referral
      await supabase.from("referrals").insert({
        referrer_user_id: referrer.user_id,
        referred_user_id: user_id,
        ref_code,
        status: "registered",
      });

      // Update profile
      await supabase
        .from("profiles")
        .update({ referred_by: ref_code })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
