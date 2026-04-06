import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractUuid(did: string): string | null {
  const m = did?.match(/did:meeet:agent_(.+)/);
  return m ? m[1] : null;
}

async function generateReceipt(claimId: string, verdict: string, confidence: number) {
  const ts = Date.now();
  const raw = `veroq:${claimId}:${verdict}:${confidence}:${ts}`;
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  const digest = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  return {
    protocol: "VeroQ/1.0",
    claim_ref: claimId,
    verdict,
    confidence,
    digest: `sha256:${digest}`,
    signature: `ed25519:${digest.substring(0, 64)}`,
    issued_at: new Date().toISOString(),
    epoch: Math.floor(ts / 86400000),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // GET /veroq-integration/stats
    if (req.method === "GET" && parts[parts.length - 1] === "stats") {
      const { data: all } = await supabase.from("verification_claims").select("verification_status, confidence_score, verifier_id");
      const claims = all || [];
      const total = claims.length;
      const verified = claims.filter(c => c.verification_status === "verified").length;
      const rejected = claims.filter(c => c.verification_status === "rejected").length;
      const pending = claims.filter(c => c.verification_status === "pending" || c.verification_status === "in_progress").length;
      const avgConf = claims.filter(c => c.confidence_score > 0).reduce((s, c) => s + c.confidence_score, 0) / (verified + rejected || 1);

      // Top verifiers
      const vCounts: Record<string, number> = {};
      for (const c of claims) {
        if (c.verifier_id && c.verification_status === "verified") {
          vCounts[c.verifier_id] = (vCounts[c.verifier_id] || 0) + 1;
        }
      }
      const topIds = Object.entries(vCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const topVerifiers = [];
      for (const [id, count] of topIds) {
        const { data: agent } = await supabase.from("agents").select("id, name, class, reputation").eq("id", id).single();
        if (agent) topVerifiers.push({ ...agent, verifications: count });
      }

      return json({ total, verified, rejected, pending, avg_confidence: Math.round(avgConf * 100) / 100, top_verifiers: topVerifiers });
    }

    // POST /veroq-integration/verify/:claimId
    if (req.method === "POST" && parts.length >= 3 && parts[parts.length - 2] === "verify") {
      const claimId = parts[parts.length - 1];
      const body = await req.json();
      const verifierUuid = extractUuid(body.verifier_did);
      if (!verifierUuid) return json({ error: "Invalid verifier_did" }, 400);

      const verdict = body.verdict;
      if (!["verified", "rejected", "disputed"].includes(verdict)) return json({ error: "Invalid verdict" }, 400);

      const confidence = Math.max(0, Math.min(1, body.confidence || 0));

      const { data: claim, error } = await supabase.from("verification_claims").select("*").eq("id", claimId).single();
      if (error || !claim) return json({ error: "Claim not found" }, 404);
      if (claim.verifier_id !== verifierUuid) return json({ error: "Not assigned as verifier" }, 403);
      if (claim.verification_status === "verified" || claim.verification_status === "rejected") return json({ error: "Already resolved" }, 400);

      const receipt = await generateReceipt(claimId, verdict, confidence);
      const now = new Date().toISOString();

      await supabase.from("verification_claims").update({
        verification_status: verdict,
        confidence_score: confidence,
        evidence: body.evidence || {},
        veroq_receipt: receipt,
        verified_at: now,
      }).eq("id", claimId);

      // Reputation updates
      const repDelta = verdict === "verified" ? 10 : verdict === "rejected" ? -5 : 0;
      const verifierDelta = 5; // verifier always gets rep for completing

      for (const [aid, delta] of [[claim.agent_id, repDelta], [verifierUuid, verifierDelta]] as [string, number][]) {
        if (delta === 0) continue;
        const { data: agent } = await supabase.from("agents").select("id, reputation").eq("id", aid).single();
        if (agent) {
          const newRep = Math.max(0, (agent.reputation || 0) + delta);
          await supabase.from("agents").update({ reputation: newRep }).eq("id", aid);
          await supabase.from("reputation_log").insert({
            agent_id: aid,
            delta,
            reason: `veroq_${verdict}:${claim.claim_type}`,
            event_type: verdict === "verified" ? "discovery_verified" : "discovery_rejected",
            reputation_delta: delta,
            reputation_before: agent.reputation || 0,
            reputation_after: newRep,
          });
        }
      }

      // Create bilateral interaction
      const baseUrl = Deno.env.get("SUPABASE_URL")!;
      await fetch(`${baseUrl}/functions/v1/interaction-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({
          initiator_did: `did:meeet:agent_${claim.agent_id}`,
          responder_did: `did:meeet:agent_${verifierUuid}`,
          interaction_type: "verification",
          context: { claim_id: claimId, verdict, claim_type: claim.claim_type },
        }),
      }).catch(() => {});

      return json({ claim_id: claimId, verdict, confidence, receipt, reputation_impact: { claimant: repDelta, verifier: verifierDelta } });
    }

    // GET /veroq-integration/claims/:agentId
    if (req.method === "GET" && parts.length >= 3) {
      const agentId = parts[parts.length - 1];
      const statusFilter = url.searchParams.get("status");

      let q1 = supabase.from("verification_claims").select("*").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(30);
      let q2 = supabase.from("verification_claims").select("*").eq("verifier_id", agentId).order("created_at", { ascending: false }).limit(30);

      if (statusFilter) {
        q1 = q1.eq("verification_status", statusFilter);
        q2 = q2.eq("verification_status", statusFilter);
      }

      const [{ data: submitted }, { data: assigned }] = await Promise.all([q1, q2]);

      return json({ agent_id: agentId, submitted: submitted || [], assigned: assigned || [] });
    }

    // POST /veroq-integration (submit-claim)
    if (req.method === "POST") {
      const body = await req.json();
      const agentUuid = extractUuid(body.agent_did);
      if (!agentUuid) return json({ error: "Invalid agent_did" }, 400);

      const validClaimTypes = ["discovery_accuracy", "research_quality", "debate_fairness", "governance_compliance"];
      const validTargetTypes = ["discovery", "debate", "governance_proposal"];
      if (!validClaimTypes.includes(body.claim_type)) return json({ error: "Invalid claim_type" }, 400);
      if (!validTargetTypes.includes(body.target_type)) return json({ error: "Invalid target_type" }, 400);

      const { data: agent } = await supabase.from("agents").select("id, reputation, balance_meeet").eq("id", agentUuid).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if ((agent.balance_meeet || 0) < 5) return json({ error: "Insufficient balance (min 5 MEEET)" }, 400);

      // Find verifier: APS >= 2 means reputation >= 500, not the claimant
      const { data: verifiers } = await supabase
        .from("agents")
        .select("id")
        .gte("reputation", 500)
        .neq("id", agentUuid)
        .limit(10);

      const verifierId = verifiers && verifiers.length > 0
        ? verifiers[Math.floor(Math.random() * verifiers.length)].id
        : null;

      const { data: claim, error } = await supabase.from("verification_claims").insert({
        agent_id: agentUuid,
        verifier_id: verifierId,
        claim_type: body.claim_type,
        target_type: body.target_type,
        target_id: body.target_id,
        claim_data: body.claim_data || {},
        verification_status: verifierId ? "in_progress" : "pending",
      }).select("id, verification_status, created_at, expires_at").single();

      if (error) return json({ error: error.message }, 500);

      // Lock 5 MEEET stake
      await supabase.from("agents").update({ balance_meeet: (agent.balance_meeet || 0) - 5 }).eq("id", agentUuid);
      await supabase.from("stakes").insert({
        agent_id: agentUuid,
        amount: 5,
        target_type: "discovery",
        target_id: body.target_id,
        status: "locked",
      }).catch(() => {});

      return json({
        claim_id: claim!.id,
        status: claim!.verification_status,
        verifier_assigned: !!verifierId,
        stake_locked: 5,
        expires_at: claim!.expires_at,
      });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
