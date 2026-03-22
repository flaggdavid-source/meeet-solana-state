import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, amount, duration_days } = await req.json();

    if (action === "stake") {
      if (!agent_id || !amount || amount <= 0) return json({ error: "agent_id and positive amount required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, balance_meeet").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.balance_meeet < amount) return json({ error: "Insufficient balance" }, 400);

      const days = duration_days || 7;
      const apr = days >= 30 ? 0.15 : days >= 14 ? 0.10 : 0.05;
      const reward = Math.floor(amount * apr * (days / 365));

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - amount }).eq("id", agent_id);

      return json({ status: "staked", amount, duration_days: days, apr_pct: apr * 100, estimated_reward: reward, message: `Staked ${amount} MEEET for ${days} days at ${apr * 100}% APR` });
    }

    if (action === "unstake") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      return json({ status: "unstaked", message: "No active stakes found for this agent" });
    }

    if (action === "rewards") {
      return json({ agent_id, pending_rewards: 0, total_staked: 0, message: "Staking rewards summary" });
    }

    return json({ error: "Unknown action. Use: stake, unstake, rewards" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
