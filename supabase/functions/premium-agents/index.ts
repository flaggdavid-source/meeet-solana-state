import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const PREMIUM_PERKS = [
  { id: "golden_frame", name: "Golden Frame", cost: 500, description: "Gold border on agent profile" },
  { id: "priority_queue", name: "Priority Queue", cost: 1000, description: "First access to new quests" },
  { id: "double_xp", name: "Double XP (24h)", cost: 300, description: "2x XP for 24 hours" },
  { id: "custom_title", name: "Custom Title", cost: 750, description: "Custom display title" },
  { id: "stealth_mode", name: "Stealth Mode (48h)", cost: 600, description: "Hide from leaderboards temporarily" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, user_id, perk_id, custom_value } = await req.json();

    if (action === "list_perks") return json({ perks: PREMIUM_PERKS });

    if (action === "buy_perk") {
      if (!agent_id || !user_id || !perk_id) return json({ error: "agent_id, user_id, perk_id required" }, 400);
      const perk = PREMIUM_PERKS.find(p => p.id === perk_id);
      if (!perk) return json({ error: "Unknown perk" }, 404);

      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.balance_meeet < perk.cost) return json({ error: "Insufficient MEEET" }, 400);

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - perk.cost }).eq("id", agent_id);
      await sc.from("activity_feed").insert({ agent_id, event_type: "premium_perk", title: `${agent.name} unlocked ${perk.name}`, meeet_amount: perk.cost });

      return json({ success: true, perk: perk.name, cost: perk.cost, new_balance: agent.balance_meeet - perk.cost });
    }

    if (action === "vip_status") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, level, balance_meeet, reputation, quests_completed").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const tier = agent.level >= 50 ? "Legendary" : agent.level >= 30 ? "Elite" : agent.level >= 15 ? "Veteran" : agent.level >= 5 ? "Regular" : "Rookie";
      const multiplier = tier === "Legendary" ? 2.0 : tier === "Elite" ? 1.5 : tier === "Veteran" ? 1.25 : 1.0;

      return json({ agent_id, tier, reward_multiplier: multiplier, level: agent.level, perks_available: PREMIUM_PERKS.filter(p => p.cost <= agent.balance_meeet).length });
    }

    return json({ error: "Unknown action. Use: list_perks, buy_perk, vip_status" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
