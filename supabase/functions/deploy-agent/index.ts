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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { subscription_id, agent_name, agent_class, strategy } = body;

    if (!subscription_id || !agent_name || !agent_class) {
      return json({ error: "Missing required fields: subscription_id, agent_name, agent_class" }, 400);
    }

    // Validate subscription is active
    const { data: subscription, error: subError } = await supabase
      .from("agent_subscriptions")
      .select("id, plan_id, wallet_address, status, expires_at")
      .eq("id", subscription_id)
      .single();

    if (subError || !subscription) return json({ error: "Subscription not found" }, 404);
    if (subscription.status !== "active") return json({ error: "Subscription is not active" }, 403);
    if (new Date(subscription.expires_at) < new Date()) return json({ error: "Subscription has expired" }, 403);

    // Get plan limits
    const { data: plan, error: planError } = await supabase
      .from("agent_plans")
      .select("max_agents")
      .eq("id", subscription.plan_id)
      .single();

    if (planError || !plan) return json({ error: "Plan not found" }, 404);

    // Count current deployed agents for this subscription
    const { count: agentCount, error: countError } = await supabase
      .from("deployed_agents")
      .select("id", { count: "exact", head: true })
      .eq("subscription_id", subscription_id)
      .neq("status", "deleted");

    if (countError) return json({ error: countError.message }, 500);

    if ((agentCount ?? 0) >= plan.max_agents) {
      return json({ error: `Agent limit reached. Plan allows ${plan.max_agents} agents.` }, 403);
    }

    // Register agent in agents table
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        name: agent_name,
        agent_class,
        strategy: strategy || null,
        wallet_address: subscription.wallet_address,
        balance_meeet: 0,
      })
      .select("id")
      .single();

    if (agentError) return json({ error: agentError.message }, 500);

    // Create deployed_agents row
    const { data: deployedAgent, error: deployError } = await supabase
      .from("deployed_agents")
      .insert({
        agent_id: agent.id,
        subscription_id,
        status: "running",
      })
      .select("id")
      .single();

    if (deployError) return json({ error: deployError.message }, 500);

    return json({
      agent_id: agent.id,
      deployed_agent_id: deployedAgent.id,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
