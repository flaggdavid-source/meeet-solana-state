import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, corsHeaders, rateLimitResponse } from "../_shared/rate-limit.ts";

const MIN_REPUTATION = 500;
const MIN_STAKE = 10;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function parseAgentId(did: string): string | null {
  const match = did?.match(/^did:meeet:agent_(.+)$/);
  return match ? match[1] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // API key auth
    const rawApiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
    if (!rawApiKey) return json({ error: "X-API-Key header required" }, 401);

    const keyHash = await hashKey(rawApiKey.trim());
    const { data: userId } = await supabase.rpc("validate_api_key", { _key_hash: keyHash });
    if (!userId) return json({ error: "Invalid or inactive API key" }, 401);

    // Rate limit: 100 req/min
    const rl = await checkRateLimit(supabase, `before_tool:${userId}`, 100, 60);
    if (!rl.allowed) return rateLimitResponse(60);

    const body = await req.json();
    const { agent_did, tool_name, params } = body;

    if (!agent_did || !tool_name) {
      return json({ error: "Missing required fields: agent_did, tool_name" }, 400);
    }

    const agentId = parseAgentId(agent_did);
    if (!agentId) return json({ error: "Invalid agent_did format. Expected did:meeet:agent_{uuid}" }, 400);

    // Fetch agent
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, name, level, reputation, balance_meeet, status, user_id")
      .eq("id", agentId)
      .single();

    if (agentErr || !agent) return json({ authorized: false, reason: "agent_not_found" }, 404);

    // Check ownership
    if (agent.user_id !== userId) return json({ authorized: false, reason: "not_owner" }, 403);

    // Check blocked
    if (agent.status === "blocked" || agent.status === "banned") {
      return json({ authorized: false, reason: "agent_blocked", current: agent.status });
    }

    // Check reputation
    if (agent.reputation < MIN_REPUTATION) {
      return json({
        authorized: false,
        reason: "insufficient_reputation",
        required: MIN_REPUTATION,
        current: agent.reputation,
      });
    }

    // Check stake
    if (agent.balance_meeet < MIN_STAKE) {
      return json({
        authorized: false,
        reason: "insufficient_stake",
        required: MIN_STAKE,
        current: agent.balance_meeet,
      });
    }

    return json({
      authorized: true,
      agent_level: agent.level,
      reputation: agent.reputation,
      available_stake: agent.balance_meeet,
      reason: null,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
