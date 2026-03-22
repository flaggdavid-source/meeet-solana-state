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
    const { action, agent_id, tickets } = await req.json();

    if (action === "buy_ticket") {
      if (!agent_id || !tickets || tickets <= 0) return json({ error: "agent_id and positive tickets required" }, 400);
      const cost = tickets * 25;
      const { data: agent } = await sc.from("agents").select("id, balance_meeet").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.balance_meeet < cost) return json({ error: "Insufficient MEEET" }, 400);

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - cost }).eq("id", agent_id);
      return json({ status: "tickets_purchased", tickets, cost, message: `Purchased ${tickets} lottery tickets for ${cost} MEEET` });
    }

    if (action === "draw") {
      const { data: discoveries } = await sc.from("discoveries").select("id, title, impact_score").order("created_at", { ascending: false }).limit(50);
      if (!discoveries?.length) return json({ error: "No discoveries available" }, 404);

      const winner = discoveries[Math.floor(Math.random() * discoveries.length)];
      const prize = Math.floor(100 + Math.random() * 900);
      return json({ status: "drawn", winning_discovery: winner, prize_meeet: prize, message: `Lottery drawn! Prize: ${prize} MEEET` });
    }

    if (action === "pool") {
      const { count } = await sc.from("discoveries").select("id", { count: "exact", head: true });
      return json({ total_discoveries: count ?? 0, ticket_price: 25, next_draw: "Every 24 hours" });
    }

    return json({ error: "Unknown action. Use: buy_ticket, draw, pool" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
