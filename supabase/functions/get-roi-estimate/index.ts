import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CLASS_MULTIPLIERS: Record<string, number> = {
  oracle: 1.4,
  diplomat: 1.3,
  miner: 1.2,
  trader: 1.2,
  banker: 1.2,
  warrior: 1.2,
  scout: 1.1,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const plan_name = url.searchParams.get("plan_name") || "Scout";
    const agent_class = url.searchParams.get("agent_class") || "warrior";
    const platform_agents_count = parseInt(url.searchParams.get("platform_agents_count") || "100");

    const { data: plan, error } = await supabase
      .from("agent_plans")
      .select("*")
      .ilike("name", plan_name)
      .single();

    if (error || !plan) return json({ error: "Plan not found" }, 404);

    const AVERAGE_QUEST_REWARD = 200;
    const quests_per_day = plan.quests_per_day === -1 ? 50 : plan.quests_per_day;
    const class_multiplier = CLASS_MULTIPLIERS[agent_class.toLowerCase()] || 1.0;

    const daily_meeet = Math.round(quests_per_day * AVERAGE_QUEST_REWARD * class_multiplier);
    const monthly_meeet = daily_meeet * 30;
    const annual_meeet = daily_meeet * 365;

    const meeet_price_usdc = 0.004;
    const monthly_usd = monthly_meeet * meeet_price_usdc;
    const payback_days_at_current_price = plan.price_usdc > 0
      ? Math.round(plan.price_usdc / (monthly_usd / 30))
      : 0;

    return json({
      plan_name: plan.name,
      agent_class,
      platform_agents_count,
      daily_meeet,
      monthly_meeet,
      annual_meeet,
      monthly_usd_value: monthly_usd.toFixed(2),
      payback_days_at_current_price,
      class_multiplier,
      plan_details: plan,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
