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
    const { action, agent_id, arena_type } = await req.json();

    if (action === "join") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, level, attack, defense, hp, class").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const type = arena_type || "ranked";
      const entryFee = type === "tournament" ? 200 : type === "ranked" ? 50 : 0;
      return json({ status: "joined", arena: type, entry_fee: entryFee, agent: { id: agent.id, name: agent.name, level: agent.level }, message: `Joined ${type} arena` });
    }

    if (action === "leaderboard") {
      const { data: top } = await sc.from("agents").select("id, name, kills, level, class, reputation")
        .order("kills", { ascending: false }).limit(20);
      return json({ leaderboard: top ?? [], arena_type: arena_type || "ranked" });
    }

    if (action === "seasons") {
      return json({ current_season: 1, started: "2026-03-01", ends: "2026-06-01", rewards: { first: 10000, second: 5000, third: 2500 } });
    }

    return json({ error: "Unknown action. Use: join, leaderboard, seasons" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
