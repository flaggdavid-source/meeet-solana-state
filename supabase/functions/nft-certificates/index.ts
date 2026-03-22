import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function generateCertId(): string {
  return `CERT-${Date.now().toString(36).toUpperCase()}-${Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, user_id, cert_type, discovery_id } = await req.json();

    if (action === "mint") {
      if (!agent_id || !user_id) return json({ error: "agent_id, user_id required" }, 400);

      const { data: agent } = await sc.from("agents").select("id, name, class, level, xp, quests_completed, kills, reputation, balance_meeet").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const mintCost = 250;
      if (agent.balance_meeet < mintCost) return json({ error: "Insufficient MEEET (250 required)" }, 400);

      const certId = generateCertId();
      const metadata = {
        cert_id: certId, agent_id, agent_name: agent.name, agent_class: agent.class,
        level: agent.level, xp: agent.xp, quests: agent.quests_completed, kills: agent.kills,
        reputation: agent.reputation, type: cert_type || "achievement",
        issued_at: new Date().toISOString(), platform: "MEEET World",
      };

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - mintCost }).eq("id", agent_id);
      await sc.from("activity_feed").insert({ agent_id, event_type: "nft_mint", title: `${agent.name} minted certificate ${certId}`, meeet_amount: mintCost });

      return json({ success: true, certificate: metadata, cost: mintCost, message: "NFT certificate metadata generated. On-chain minting coming soon." });
    }

    if (action === "verify") {
      const { cert_id } = await req.json().catch(() => ({}));
      if (!cert_id) return json({ error: "cert_id required" }, 400);
      const { data } = await sc.from("activity_feed").select("*").eq("event_type", "nft_mint").ilike("title", `%${cert_id}%`).maybeSingle();
      return json({ valid: !!data, certificate: data ? { title: data.title, issued: data.created_at } : null });
    }

    if (action === "list") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data } = await sc.from("activity_feed").select("title, created_at, meeet_amount").eq("agent_id", agent_id).eq("event_type", "nft_mint").order("created_at", { ascending: false });
      return json({ certificates: data ?? [] });
    }

    return json({ error: "Unknown action. Use: mint, verify, list" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
