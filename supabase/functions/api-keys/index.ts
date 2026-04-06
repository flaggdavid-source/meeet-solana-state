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

function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "meeet_pk_";
  for (let i = 0; i < 32; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api-keys\/?/, "/").replace(/\/+/g, "/");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // POST /generate
    if (req.method === "POST" && path === "/generate") {
      const body = await req.json();
      const { agent_did, name, permissions, rate_limit, expires_in_days } = body;
      if (!agent_did || !name) return json({ error: "agent_did and name required" }, 400);

      const agentId = agent_did.replace("did:meeet:agent_", "");
      const { data: agent } = await supabase.from("agents").select("id, user_id").eq("id", agentId).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const rawKey = generateApiKey();
      const keyHash = await sha256(rawKey);
      const prefix = rawKey.substring(0, 17); // meeet_pk_ + 8 chars
      const expiresAt = expires_in_days
        ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
        : null;

      const { data: keyRow, error } = await supabase.from("api_keys").insert({
        user_id: agent.user_id,
        agent_id: agentId,
        key_hash: keyHash,
        key_prefix: prefix,
        name: name || "API Key",
        permissions: permissions || ["callbacks", "staking", "reputation", "attestations", "interactions", "veroq"],
        rate_limit: rate_limit || 100,
        status: "active",
        expires_at: expiresAt,
      }).select("id, key_prefix, permissions, rate_limit, daily_limit, expires_at").single();

      if (error) return json({ error: error.message }, 500);

      return json({
        api_key: rawKey,
        key_id: keyRow.id,
        prefix: keyRow.key_prefix,
        permissions: keyRow.permissions,
        rate_limit: keyRow.rate_limit,
        daily_limit: keyRow.daily_limit,
        expires_at: keyRow.expires_at,
      });
    }

    // GET /list?agent_id=xxx
    if (req.method === "GET" && path === "/list") {
      const agentId = url.searchParams.get("agent_id");
      if (!agentId) return json({ error: "agent_id required" }, 400);

      const { data } = await supabase.from("api_keys")
        .select("id, key_prefix, name, permissions, rate_limit, daily_limit, status, usage_count, last_used_at, created_at, expires_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      return json({ keys: data || [] });
    }

    // POST /revoke/:keyId
    const revokeMatch = path.match(/^\/revoke\/([a-f0-9-]+)$/);
    if (req.method === "POST" && revokeMatch) {
      const keyId = revokeMatch[1];
      const { error } = await supabase.from("api_keys")
        .update({ status: "revoked", is_active: false })
        .eq("id", keyId);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, message: "API key revoked" });
    }

    // GET /usage/:keyId
    const usageMatch = path.match(/^\/usage\/([a-f0-9-]+)$/);
    if (req.method === "GET" && usageMatch) {
      const keyId = usageMatch[1];
      const { data: key } = await supabase.from("api_keys")
        .select("id, key_prefix, name, usage_count, rate_limit, daily_limit, last_used_at, status")
        .eq("id", keyId).single();
      if (!key) return json({ error: "Key not found" }, 404);

      const { data: logs } = await supabase.from("rate_limit_log")
        .select("endpoint, request_count, window_start, window_type")
        .eq("api_key_id", keyId)
        .order("window_start", { ascending: false })
        .limit(100);

      // Aggregate by endpoint
      const byEndpoint: Record<string, number> = {};
      (logs || []).forEach(l => {
        byEndpoint[l.endpoint] = (byEndpoint[l.endpoint] || 0) + l.request_count;
      });

      return json({
        key,
        usage_by_endpoint: byEndpoint,
        recent_logs: logs || [],
      });
    }

    // POST /validate — internal middleware helper
    if (req.method === "POST" && path === "/validate") {
      const body = await req.json();
      const { api_key, endpoint, required_permission } = body;
      if (!api_key) return json({ error: "api_key required" }, 400);

      const keyHash = await sha256(api_key);
      const { data: key } = await supabase.from("api_keys")
        .select("*")
        .eq("key_hash", keyHash)
        .eq("status", "active")
        .single();

      if (!key) return json({ authorized: false, error: "Invalid or revoked API key" }, 401);
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        await supabase.from("api_keys").update({ status: "expired" }).eq("id", key.id);
        return json({ authorized: false, error: "API key expired" }, 401);
      }

      // Check permission
      const perms = (key.permissions as string[]) || [];
      if (required_permission && !perms.includes(required_permission)) {
        return json({ authorized: false, error: `Missing permission: ${required_permission}` }, 403);
      }

      // Rate limit check (sliding window per minute)
      const windowStart = new Date(Date.now() - 60000).toISOString();
      const { data: recentLogs } = await supabase.from("rate_limit_log")
        .select("request_count")
        .eq("api_key_id", key.id)
        .eq("window_type", "minute")
        .gte("window_start", windowStart);

      const totalRequests = (recentLogs || []).reduce((s, l) => s + l.request_count, 0);
      if (totalRequests >= (key.rate_limit || 100)) {
        return json({ authorized: false, error: "Rate limit exceeded" }, 429);
      }

      // Log the request
      await supabase.from("rate_limit_log").insert({
        api_key_id: key.id,
        endpoint: endpoint || "unknown",
        request_count: 1,
        window_type: "minute",
      });

      // Update usage
      await supabase.from("api_keys").update({
        usage_count: (key.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      }).eq("id", key.id);

      return json({
        authorized: true,
        agent_id: key.agent_id,
        user_id: key.user_id,
        permissions: key.permissions,
      });
    }

    return json({ error: "Not found", routes: ["/generate", "/list", "/revoke/:id", "/usage/:id", "/validate"] }, 404);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
