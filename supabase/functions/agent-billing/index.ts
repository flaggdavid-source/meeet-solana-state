// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICES: Record<string, number> = {
  chat_message: 0.006,
  discovery: 0.01,
  arena_debate: 0.02,
  phone_call: 0.10,
  email_send: 0.02,
  sms_send: 0.04,
  bulk_email: 1.00,
  memory_save: 0.002,
  memory_recall: 0.002,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { action, user_id } = body;

    if (!user_id) throw new Error("user_id required");

    // Ensure billing account exists
    const { data: existing } = await supabase.from("agent_billing").select("*").eq("user_id", user_id).single();
    if (!existing) {
      await supabase.from("agent_billing").insert({ user_id, balance_usd: 1.0, free_credit_used: false });
    }

    // GET BALANCE
    if (action === "balance") {
      const { data: bill } = await supabase.from("agent_billing").select("*").eq("user_id", user_id).single();
      return json({ success: true, balance: bill?.balance_usd ?? 1.0, total_spent: bill?.total_spent ?? 0 });
    }

    // CHARGE
    if (action === "charge") {
      const { action_type, agent_id } = body;
      const cost = PRICES[action_type];
      if (cost === undefined) throw new Error("Unknown action_type: " + action_type);

      const { data: bill } = await supabase.from("agent_billing").select("*").eq("user_id", user_id).single();
      if (!bill || bill.balance_usd < cost) {
        return json({ success: false, error: "Insufficient balance", balance: bill?.balance_usd ?? 0, required: cost }, 402);
      }

      await supabase.from("agent_billing").update({
        balance_usd: bill.balance_usd - cost,
        total_spent: (bill.total_spent || 0) + cost,
        total_charged: (bill.total_charged || 0) + cost,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user_id);

      if (agent_id) {
        await supabase.from("agent_actions").insert({
          agent_id, user_id, action_type, cost_usd: cost,
          details: { charged: cost, remaining: bill.balance_usd - cost },
        });
      }

      return json({ success: true, charged: cost, remaining: bill.balance_usd - cost });
    }

    // ADD FUNDS
    if (action === "add_funds") {
      const { amount } = body;
      const amt = parseFloat(amount);
      if (!amt || amt <= 0 || amt > 1000) throw new Error("Amount must be between $0.01 and $1000");

      const { data: bill } = await supabase.from("agent_billing").select("*").eq("user_id", user_id).single();
      const newBalance = (bill?.balance_usd ?? 0) + amt;

      await supabase.from("agent_billing").update({
        balance_usd: newBalance,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user_id);

      return json({ success: true, added: amt, balance: newBalance });
    }

    // USAGE HISTORY
    if (action === "usage") {
      const { data: actions } = await supabase.from("agent_actions").select("*").eq("user_id", user_id).order("created_at", { ascending: false }).limit(50);
      const { data: bill } = await supabase.from("agent_billing").select("*").eq("user_id", user_id).single();
      return json({ success: true, balance: bill?.balance_usd ?? 0, total_spent: bill?.total_spent ?? 0, actions: actions || [] });
    }

    // PRICING
    if (action === "pricing") {
      return json({ success: true, prices: PRICES });
    }

    throw new Error("Unknown action. Available: balance, charge, add_funds, usage, pricing");
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
});
