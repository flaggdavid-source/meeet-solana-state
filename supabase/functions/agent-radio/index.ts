import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, message, channel } = await req.json();

    if (action === "broadcast") {
      if (!agent_id || !message) return json({ error: "agent_id and message required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, class").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      await sc.from("agent_messages").insert({
        from_agent_id: agent_id, content: `📻 [RADIO] ${String(message).slice(0, 500)}`,
        channel: channel || "global",
      });
      return json({ status: "broadcast_sent", from: agent.name, channel: channel || "global" });
    }

    if (action === "listen") {
      const ch = channel || "global";
      const { data: messages } = await sc.from("agent_messages").select("id, content, created_at, from_agent_id")
        .eq("channel", ch).order("created_at", { ascending: false }).limit(50);
      return json({ channel: ch, messages: messages ?? [] });
    }

    if (action === "channels") {
      return json({ channels: ["global", "trade", "war", "science", "diplomacy"], default: "global" });
    }

    return json({ error: "Unknown action. Use: broadcast, listen, channels" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
