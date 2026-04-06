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

const TRUSTED_PROVIDERS: Record<string, string> = {
  "did:moltrust": "moltrust",
  "did:veroq": "veroq",
};

function detectProvider(issuerDid: string): string {
  for (const [prefix, name] of Object.entries(TRUSTED_PROVIDERS)) {
    if (issuerDid?.startsWith(prefix)) return name;
  }
  return "manual";
}

function decodeJwsParts(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid JWS token");
  const decode = (s: string) => JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));
  const header = decode(parts[0]);
  const payload = decode(parts[1]);
  return { header, payload, hasSignature: parts.length === 3 && !!parts[2] };
}

function extractAgentUuid(did: string): string | null {
  const m = did?.match(/did:meeet:agent_(.+)/);
  return m ? m[1] : null;
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
    // POST /attestation-import/verify/:attestationId
    if (req.method === "POST" && parts.length >= 3 && parts[parts.length - 2] === "verify") {
      const attestationId = parts[parts.length - 1];
      const { data: att, error } = await supabase
        .from("attestations")
        .select("*")
        .eq("id", attestationId)
        .single();

      if (error || !att) return json({ error: "Attestation not found" }, 404);

      let newStatus = att.status;
      if (att.expires_at && new Date(att.expires_at) < new Date()) {
        newStatus = "expired";
      } else if (att.signature_valid) {
        newStatus = "valid";
      } else {
        newStatus = "pending_verification";
      }

      await supabase
        .from("attestations")
        .update({ status: newStatus })
        .eq("id", attestationId);

      return json({ attestation_id: attestationId, status: newStatus, verified_at: new Date().toISOString() });
    }

    // GET /attestation-import/agent/:agentId
    if (req.method === "GET" && parts.length >= 3 && parts[parts.length - 2] === "agent") {
      const agentId = parts[parts.length - 1];
      const { data: atts, error } = await supabase
        .from("attestations")
        .select("*")
        .eq("agent_id", agentId)
        .order("imported_at", { ascending: false });

      if (error) return json({ error: error.message }, 500);

      // Group by provider
      const grouped: Record<string, any[]> = {};
      for (const a of atts || []) {
        const p = a.provider || "manual";
        if (!grouped[p]) grouped[p] = [];
        grouped[p].push(a);
      }

      return json({ agent_id: agentId, attestations: grouped, total: atts?.length || 0 });
    }

    // POST /attestation-import (import)
    if (req.method === "POST") {
      const body = await req.json();
      const { format } = body;

      let issuerDid = "";
      let subjectDid = "";
      let claims: Record<string, any> = {};
      let rawPayload: any = {};
      let signatureValid = false;
      let issuedAt: string | null = null;
      let expiresAt: string | null = null;

      if (format === "jws") {
        const { token } = body;
        if (!token) return json({ error: "token required for JWS format" }, 400);
        const { header, payload, hasSignature } = decodeJwsParts(token);
        issuerDid = payload.iss || "";
        subjectDid = payload.sub || "";
        claims = payload;
        rawPayload = { header, payload, token };
        signatureValid = hasSignature; // mock verification
        issuedAt = payload.iat ? new Date(payload.iat * 1000).toISOString() : null;
        expiresAt = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
      } else if (format === "json") {
        const { payload } = body;
        if (!payload) return json({ error: "payload required for JSON format" }, 400);
        issuerDid = payload.issuer || "";
        subjectDid = payload.subject || "";
        claims = payload.claims || {};
        rawPayload = payload;
        signatureValid = !!payload.signature;
        issuedAt = payload.issued_at || null;
        expiresAt = payload.expires_at || null;
      } else if (format === "object") {
        const { attestation } = body;
        if (!attestation) return json({ error: "attestation required for object format" }, 400);
        issuerDid = attestation.issuer || "";
        subjectDid = attestation.credentialSubject?.id || "";
        claims = attestation.credentialSubject || {};
        rawPayload = attestation;
        signatureValid = !!attestation.proof;
        issuedAt = attestation.issuanceDate || null;
        expiresAt = attestation.expirationDate || null;
      } else {
        return json({ error: "format must be jws, json, or object" }, 400);
      }

      // Resolve agent
      const agentUuid = extractAgentUuid(subjectDid);
      if (!agentUuid) return json({ error: "Could not resolve agent DID from subject" }, 400);

      const { data: agent } = await supabase
        .from("agents")
        .select("id, reputation")
        .eq("id", agentUuid)
        .single();

      if (!agent) return json({ error: "Agent not found" }, 404);

      const provider = detectProvider(issuerDid);
      const status = signatureValid ? "valid" : "pending_verification";
      const claimsCount = Object.keys(claims).length;

      // Insert attestation
      const { data: att, error: insertErr } = await supabase
        .from("attestations")
        .insert({
          agent_id: agent.id,
          provider,
          format,
          raw_payload: rawPayload,
          parsed_claims: claims,
          signature_valid: signatureValid,
          issuer_did: issuerDid,
          subject_did: subjectDid,
          issued_at: issuedAt,
          expires_at: expiresAt,
          status,
        })
        .select("id")
        .single();

      if (insertErr) return json({ error: insertErr.message }, 500);

      // If valid attestation from trusted provider, update reputation
      let reputationImpact = "";
      if (status === "valid" && provider !== "manual") {
        const delta = 15;
        const newRep = (agent.reputation || 0) + delta;
        await supabase.from("agents").update({ reputation: newRep }).eq("id", agent.id);
        await supabase.from("reputation_log").insert({
          agent_id: agent.id,
          delta,
          reason: `attestation_import:${provider}`,
          event_type: "discovery_verified",
          reputation_delta: delta,
          reputation_before: agent.reputation || 0,
          reputation_after: newRep,
        });
        reputationImpact = `+${delta} trust points`;
      }

      return json({
        attestation_id: att!.id,
        provider,
        status,
        claims_count: claimsCount,
        reputation_impact: reputationImpact || "none",
      });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
