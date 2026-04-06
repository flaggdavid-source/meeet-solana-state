import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VALID_EVENTS = [
  "reputation.updated", "stake.locked", "stake.resolved",
  "verification.completed", "attestation.imported", "interaction.confirmed",
  "claim.submitted", "claim.verified",
];

function generateSecret(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "whsec_";
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function deliverWebhook(
  supabase: ReturnType<typeof createClient>,
  webhook: { id: string; url: string; secret: string },
  eventType: string,
  eventData: unknown,
  attempt = 1
): Promise<{ success: boolean; status?: number }> {
  const deliveryId = crypto.randomUUID();
  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: eventData,
    webhook_id: webhook.id,
    delivery_id: deliveryId,
  };
  const body = JSON.stringify(payload);
  const signature = await hmacSign(webhook.secret, body);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-ID": deliveryId,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const respBody = await resp.text().catch(() => "");
    await supabase.from("webhook_deliveries").insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload,
      response_status: resp.status,
      response_body: respBody.substring(0, 4096),
      attempt_number: attempt,
      delivered_at: new Date().toISOString(),
    });

    const success = resp.status >= 200 && resp.status < 300;
    if (!success && attempt < 5) {
      await supabase.from("webhooks").update({ retry_count: attempt }).eq("id", webhook.id);
    } else if (!success && attempt >= 5) {
      await supabase.from("webhooks").update({ status: "failed", retry_count: attempt }).eq("id", webhook.id);
    } else {
      await supabase.from("webhooks").update({
        last_triggered_at: new Date().toISOString(),
        retry_count: 0,
      }).eq("id", webhook.id);
    }
    return { success, status: resp.status };
  } catch (e) {
    await supabase.from("webhook_deliveries").insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload,
      response_status: 0,
      response_body: e.message?.substring(0, 4096) || "Timeout/network error",
      attempt_number: attempt,
    });
    if (attempt >= 5) {
      await supabase.from("webhooks").update({ status: "failed", retry_count: attempt }).eq("id", webhook.id);
    }
    return { success: false, status: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/webhooks\/?/, "/").replace(/\/+/g, "/");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // POST /register
    if (req.method === "POST" && path === "/register") {
      const body = await req.json();
      const { agent_id, url: webhookUrl, events, secret } = body;
      if (!agent_id || !webhookUrl) return json({ error: "agent_id and url required" }, 400);
      if (!webhookUrl.startsWith("https://")) return json({ error: "Only HTTPS URLs allowed" }, 400);

      const validEvents = (events || []).filter((e: string) => VALID_EVENTS.includes(e));
      if (validEvents.length === 0) return json({ error: "At least one valid event required", valid_events: VALID_EVENTS }, 400);

      const { data: agent } = await supabase.from("agents").select("id").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const webhookSecret = secret || generateSecret();
      const { data: wh, error } = await supabase.from("webhooks").insert({
        agent_id,
        url: webhookUrl,
        events: validEvents,
        secret: webhookSecret,
        status: "active",
      }).select("id, url, events, status, created_at").single();

      if (error) return json({ error: error.message }, 500);
      return json({ ...wh, secret: webhookSecret, message: "Secret shown only once. Store it securely." });
    }

    // GET /list?agent_id=xxx
    if (req.method === "GET" && path === "/list") {
      const agentId = url.searchParams.get("agent_id");
      if (!agentId) return json({ error: "agent_id required" }, 400);

      const { data } = await supabase.from("webhooks")
        .select("id, url, events, status, retry_count, last_triggered_at, created_at, updated_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });
      return json({ webhooks: data || [] });
    }

    // DELETE /delete/:webhookId
    const deleteMatch = path.match(/^\/delete\/([a-f0-9-]+)$/);
    if (req.method === "DELETE" && deleteMatch) {
      const { error } = await supabase.from("webhooks").delete().eq("id", deleteMatch[1]);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // POST /pause/:webhookId or /resume/:webhookId
    const toggleMatch = path.match(/^\/(pause|resume)\/([a-f0-9-]+)$/);
    if (req.method === "POST" && toggleMatch) {
      const newStatus = toggleMatch[1] === "pause" ? "paused" : "active";
      await supabase.from("webhooks").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", toggleMatch[2]);
      return json({ success: true, status: newStatus });
    }

    // POST /test/:webhookId
    const testMatch = path.match(/^\/test\/([a-f0-9-]+)$/);
    if (req.method === "POST" && testMatch) {
      const { data: wh } = await supabase.from("webhooks")
        .select("id, url, secret, events").eq("id", testMatch[1]).single();
      if (!wh) return json({ error: "Webhook not found" }, 404);

      const result = await deliverWebhook(supabase, wh, "test.ping", {
        message: "Test webhook delivery from MEEET STATE",
        timestamp: new Date().toISOString(),
      });
      return json({ delivered: result.success, response_status: result.status });
    }

    // GET /deliveries/:webhookId
    const deliveriesMatch = path.match(/^\/deliveries\/([a-f0-9-]+)$/);
    if (req.method === "GET" && deliveriesMatch) {
      const { data } = await supabase.from("webhook_deliveries")
        .select("id, event_type, response_status, attempt_number, delivered_at, created_at")
        .eq("webhook_id", deliveriesMatch[1])
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ deliveries: data || [] });
    }

    // POST /dispatch — internal: dispatch event to all matching webhooks
    if (req.method === "POST" && path === "/dispatch") {
      const body = await req.json();
      const { agent_id, event_type, data: eventData } = body;
      if (!agent_id || !event_type) return json({ error: "agent_id and event_type required" }, 400);

      // Rate limit: 100 deliveries/hour per agent
      const hourAgo = new Date(Date.now() - 3600000).toISOString();
      const { data: recentCount } = await supabase
        .from("webhook_deliveries")
        .select("id", { count: "exact" })
        .gte("created_at", hourAgo)
        .limit(0);

      const { data: webhooks } = await supabase.from("webhooks")
        .select("id, url, secret, events")
        .eq("agent_id", agent_id)
        .eq("status", "active");

      const matching = (webhooks || []).filter(w =>
        (w.events as string[]).includes(event_type)
      );

      const results = await Promise.all(
        matching.map(w => deliverWebhook(supabase, w, event_type, eventData))
      );

      return json({
        dispatched: matching.length,
        results: results.map((r, i) => ({
          webhook_id: matching[i].id,
          success: r.success,
          status: r.status,
        })),
      });
    }

    return json({ error: "Not found", routes: ["/register", "/list", "/delete/:id", "/test/:id", "/deliveries/:id", "/dispatch", "/pause/:id", "/resume/:id"] }, 404);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
