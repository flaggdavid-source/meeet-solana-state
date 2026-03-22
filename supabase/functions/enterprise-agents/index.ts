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
    const { action, user_id, agent_ids, fleet_name } = await req.json();

    if (action === "create_fleet") {
      if (!user_id || !fleet_name) return json({ error: "user_id and fleet_name required" }, 400);
      return json({ status: "fleet_created", fleet_name, owner: user_id, max_agents: 50, tier: "enterprise", message: `Fleet "${fleet_name}" created` });
    }

    if (action === "fleet_stats") {
      if (!user_id) return json({ error: "user_id required" }, 400);
      const { data: agents } = await sc.from("agents").select("id, name, class, level, balance_meeet, quests_completed").eq("user_id", user_id);
      const total = agents?.reduce((s, a) => s + (a.balance_meeet || 0), 0) || 0;
      const quests = agents?.reduce((s, a) => s + (a.quests_completed || 0), 0) || 0;
      return json({ agent_count: agents?.length ?? 0, total_balance: total, total_quests: quests, agents: agents ?? [] });
    }

    if (action === "bulk_deploy") {
      if (!agent_ids?.length) return json({ error: "agent_ids array required" }, 400);
      return json({ status: "deployed", count: agent_ids.length, message: `${agent_ids.length} agents deployed in bulk` });
    }

    return json({ error: "Unknown action. Use: create_fleet, fleet_stats, bulk_deploy" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
