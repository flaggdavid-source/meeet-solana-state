import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, corsHeaders, rateLimitResponse } from "../_shared/rate-limit.ts";

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

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function mockEd25519Signature(digest: string): string {
  // Mock Ed25519 signature — deterministic placeholder
  return digest.slice(0, 64) + digest.split("").reverse().join("").slice(0, 64);
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
    const rl = await checkRateLimit(supabase, `after_tool:${userId}`, 100, 60);
    if (!rl.allowed) return rateLimitResponse(60);

    const body = await req.json();
    const { agent_did, tool_name, result } = body;

    if (!agent_did || !tool_name || !result) {
      return json({ error: "Missing required fields: agent_did, tool_name, result" }, 400);
    }

    const agentId = parseAgentId(agent_did);
    if (!agentId) return json({ error: "Invalid agent_did format" }, 400);

    // Fetch agent
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, reputation, balance_meeet, user_id")
      .eq("id", agentId)
      .single();

    if (agentErr || !agent) return json({ error: "Agent not found" }, 404);
    if (agent.user_id !== userId) return json({ error: "Not authorized" }, 403);

    // Calculate reputation delta based on confidence
    const confidence = typeof result.confidence === "number" ? Math.min(Math.max(result.confidence, 0), 1) : 0.5;
    const reputationDelta = Math.round(confidence * 20); // 0-20 rep points

    // Determine stake result
    let stakeResult = "none";
    const stakeLockAmount = 10;
    if (confidence >= 0.8) {
      stakeResult = "locked"; // high confidence = stake locked as collateral
    } else if (confidence >= 0.5) {
      stakeResult = "locked";
    } else {
      stakeResult = "at_risk"; // low confidence = stake at risk of slash
    }

    // Build receipt
    const actionRef = result.discovery_id ? `discovery_${result.discovery_id}` : `action_${tool_name}`;
    const compoundDigest = await sha256Hex(
      JSON.stringify({ agent_did, tool_name, result, ts: Date.now() })
    );
    const signature = mockEd25519Signature(compoundDigest);
    const evaluationTime = `epoch_${Math.floor(Date.now() / 1000)}`;

    const receipt = {
      action_ref: actionRef,
      compound_digest: `sha256:${compoundDigest}`,
      signature: `ed25519:${signature}`,
      evaluation_time: evaluationTime,
    };

    // Insert verification record
    const { data: verification, error: verErr } = await supabase
      .from("verifications")
      .insert({
        agent_id: agentId,
        tool_name,
        discovery_id: result.discovery_id || null,
        vote: result.vote || null,
        confidence,
        result_data: result,
        reputation_delta: reputationDelta,
        stake_result: stakeResult,
        receipt,
      })
      .select("id")
      .single();

    if (verErr) return json({ error: "Failed to record verification: " + verErr.message }, 500);

    // Update agent reputation
    await supabase
      .from("agents")
      .update({ reputation: agent.reputation + reputationDelta })
      .eq("id", agentId);

    // Log activity
    await supabase.from("activity_feed").insert({
      agent_id: agentId,
      event_type: "verification",
      title: `Verified: ${tool_name}`,
      description: `Confidence ${(confidence * 100).toFixed(0)}%, rep +${reputationDelta}`,
      meeet_amount: reputationDelta,
    });

    return json({
      verification_id: verification.id,
      reputation_delta: reputationDelta,
      stake_result: stakeResult,
      receipt,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
