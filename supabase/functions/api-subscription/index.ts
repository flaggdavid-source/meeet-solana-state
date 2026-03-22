import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const API_TIERS = [
  { id: "free", name: "Free", requests_per_day: 100, agents: 1, price_meeet: 0 },
  { id: "starter", name: "Starter", requests_per_day: 1000, agents: 5, price_meeet: 500 },
  { id: "pro", name: "Pro", requests_per_day: 10000, agents: 25, price_meeet: 2500 },
  { id: "enterprise", name: "Enterprise", requests_per_day: 100000, agents: 100, price_meeet: 10000 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, user_id, tier_id } = await req.json();

    if (action === "list_tiers") return json({ tiers: API_TIERS });

    if (action === "subscribe") {
      if (!user_id || !tier_id) return json({ error: "user_id, tier_id required" }, 400);
      const tier = API_TIERS.find(t => t.id === tier_id);
      if (!tier) return json({ error: "Unknown tier" }, 404);

      if (tier.price_meeet > 0) {
        const { data: agents } = await sc.from("agents").select("id, balance_meeet").eq("user_id", user_id).order("balance_meeet", { ascending: false }).limit(1);
        const agent = agents?.[0];
        if (!agent || agent.balance_meeet < tier.price_meeet) return json({ error: "Insufficient MEEET across your agents" }, 400);
        await sc.from("agents").update({ balance_meeet: agent.balance_meeet - tier.price_meeet }).eq("id", agent.id);
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await sc.from("agent_subscriptions").insert({ user_id, status: "active", started_at: new Date().toISOString(), expires_at: expiresAt });

      return json({ success: true, tier: tier.name, expires_at: expiresAt, limits: { requests_per_day: tier.requests_per_day, max_agents: tier.agents } });
    }

    if (action === "status") {
      if (!user_id) return json({ error: "user_id required" }, 400);
      const { data: sub } = await sc.from("agent_subscriptions").select("*").eq("user_id", user_id).eq("status", "active").order("expires_at", { ascending: false }).limit(1).maybeSingle();
      return json({ subscription: sub, active: !!sub });
    }

    return json({ error: "Unknown action. Use: list_tiers, subscribe, status" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
