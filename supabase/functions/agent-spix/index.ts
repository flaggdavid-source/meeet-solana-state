// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  const SPIX_API = Deno.env.get("SPIX_API_KEY");
  const BILLING_URL = Deno.env.get("SUPABASE_URL") + "/functions/v1/agent-billing";

  try {
    const body = await req.json();
    const { action, user_id, agent_id } = body;
    if (!user_id || !agent_id) throw new Error("user_id and agent_id required");

    const { data: agent } = await supabase.from("agents").select("*").eq("id", agent_id).single();
    if (!agent) throw new Error("Agent not found");

    // Helper: charge via billing
    async function chargeUser(actionType: string) {
      const res = await fetch(BILLING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "charge", user_id, agent_id, action_type: actionType }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("Insufficient balance. Current: $" + (data.balance ?? 0).toFixed(2));
      return data;
    }

    // MAKE CALL
    if (action === "make_call") {
      const { phone_number, message } = body;
      if (!phone_number || !message) throw new Error("phone_number and message required");
      await chargeUser("phone_call");

      let callResult = { status: "simulated", message: "Call simulated — Spix API key not configured" };
      if (SPIX_API) {
        try {
          const res = await fetch("https://api.spix.ai/v1/calls", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SPIX_API },
            body: JSON.stringify({
              to: phone_number,
              agent_name: agent.name,
              prompt: message,
              voice: "professional",
            }),
          });
          callResult = await res.json();
        } catch (e) {
          callResult = { status: "simulated", error: e.message };
        }
      }

      await supabase.from("agent_actions").insert({
        agent_id, user_id, action_type: "phone_call", cost_usd: 0.10,
        details: { phone: phone_number, message, result: callResult },
      });

      return json({ success: true, call: callResult });
    }

    // SEND EMAIL
    if (action === "send_email") {
      const { to_email, subject, body: emailBody } = body;
      if (!to_email || !subject) throw new Error("to_email and subject required");
      await chargeUser("email_send");

      let emailResult = { status: "simulated", message: "Email simulated — Spix API key not configured" };
      if (SPIX_API) {
        try {
          const res = await fetch("https://api.spix.ai/v1/email", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SPIX_API },
            body: JSON.stringify({
              to: to_email, subject, body: emailBody,
              from_name: agent.name + " (MEEET Agent)",
            }),
          });
          emailResult = await res.json();
        } catch (e) {
          emailResult = { status: "simulated", error: e.message };
        }
      }

      await supabase.from("agent_actions").insert({
        agent_id, user_id, action_type: "email_send", cost_usd: 0.02,
        details: { to: to_email, subject, result: emailResult },
      });

      return json({ success: true, email: emailResult });
    }

    // BULK EMAIL
    if (action === "bulk_email") {
      const { recipients, subject, body: emailBody } = body;
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) throw new Error("recipients array required");
      await chargeUser("bulk_email");

      let bulkResult = { status: "simulated", count: recipients.length };
      if (SPIX_API) {
        try {
          const res = await fetch("https://api.spix.ai/v1/email/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SPIX_API },
            body: JSON.stringify({
              recipients, subject, body: emailBody,
              from_name: agent.name + " (MEEET Agent)",
            }),
          });
          bulkResult = await res.json();
        } catch (e) {
          bulkResult = { status: "simulated", error: e.message };
        }
      }

      await supabase.from("agent_actions").insert({
        agent_id, user_id, action_type: "bulk_email", cost_usd: 1.00,
        details: { count: recipients.length, subject, result: bulkResult },
      });

      return json({ success: true, bulk: bulkResult });
    }

    // SEND SMS
    if (action === "send_sms") {
      const { phone_number, message } = body;
      if (!phone_number || !message) throw new Error("phone_number and message required");
      await chargeUser("sms_send");

      let smsResult = { status: "simulated", message: "SMS simulated — Spix API key not configured" };
      if (SPIX_API) {
        try {
          const res = await fetch("https://api.spix.ai/v1/sms", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SPIX_API },
            body: JSON.stringify({ to: phone_number, message: "[" + agent.name + "] " + message }),
          });
          smsResult = await res.json();
        } catch (e) {
          smsResult = { status: "simulated", error: e.message };
        }
      }

      await supabase.from("agent_actions").insert({
        agent_id, user_id, action_type: "sms_send", cost_usd: 0.04,
        details: { phone: phone_number, message, result: smsResult },
      });

      return json({ success: true, sms: smsResult });
    }

    // ACTION HISTORY
    if (action === "action_history") {
      const { data } = await supabase.from("agent_actions").select("*").eq("user_id", user_id).order("created_at", { ascending: false }).limit(50);
      return json({ success: true, actions: data || [] });
    }

    throw new Error("Unknown action. Available: make_call, send_email, bulk_email, send_sms, action_history");
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
});
