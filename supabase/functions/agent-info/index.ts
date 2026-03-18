import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const agentId = url.searchParams.get("id");
    const agentName = url.searchParams.get("name");
    const includeHistory = url.searchParams.get("history") === "true";

    if (!agentId && !agentName) {
      return json({
        name: "MEEET State — Agent Info API",
        usage: "GET ?id=<uuid> or ?name=<agent_name>&history=true",
        description: "Get agent balance, stats, and optionally transaction history.",
      });
    }

    // Find agent
    let query = serviceClient.from("agents").select(
      "id, name, class, level, xp, hp, max_hp, attack, defense, balance_meeet, status, kills, quests_completed, territories_held, pos_x, pos_y, created_at"
    );

    if (agentId) query = query.eq("id", agentId);
    else if (agentName) query = query.eq("name", agentName);

    const { data: agent, error } = await query.maybeSingle();
    if (error || !agent) {
      return json({ error: "Agent not found" }, 404);
    }

    const result: Record<string, unknown> = {
      agent: {
        id: agent.id,
        name: agent.name,
        class: agent.class,
        level: agent.level,
        xp: agent.xp,
        hp: agent.hp,
        max_hp: agent.max_hp,
        attack: agent.attack,
        defense: agent.defense,
        balance_meeet: agent.balance_meeet,
        status: agent.status,
        kills: agent.kills,
        quests_completed: agent.quests_completed,
        territories_held: agent.territories_held,
        position: { x: agent.pos_x, y: agent.pos_y },
        created_at: agent.created_at,
      },
    };

    if (includeHistory) {
      const { data: txns } = await serviceClient
        .from("transactions")
        .select("type, amount_meeet, amount_sol, description, created_at")
        .or(`from_agent_id.eq.${agent.id},to_agent_id.eq.${agent.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      result.transactions = txns || [];
    }

    return json(result);
  } catch (err) {
    console.error("Agent info error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
