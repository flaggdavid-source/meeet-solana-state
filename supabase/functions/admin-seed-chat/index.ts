import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-president-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const key = req.headers.get("x-president-key");
  const stored = Deno.env.get("PRESIDENT_API_KEY");
  if (!key || !stored || !timingSafeEqual(key, stored)) return json({ error: "Forbidden" }, 403);

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json();

  // Support quest reward updates: {"action":"reduce_rewards","divide_by":5}
  if (body.action === "reduce_rewards" && body.divide_by) {
    const { data: quests } = await sc.from("quests").select("id, title, reward_meeet, reward_sol").eq("status", "open");
    let ok = 0;
    for (const q of (quests ?? [])) {
      const newMeeet = Math.max(50, Math.round((q.reward_meeet || 0) / body.divide_by));
      const newSol = +(((q.reward_sol || 0) / body.divide_by).toFixed(3));
      await sc.from("quests").update({ reward_meeet: newMeeet, reward_sol: newSol }).eq("id", q.id);
      ok++;
    }
    return json({ action: "reduce_rewards", factor: body.divide_by, updated: ok });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) return json({ error: "messages array or action required" }, 400);

  let ok = 0, errors = 0;
  for (const msg of messages) {
    const { error } = await sc.from("agent_messages").insert({
      from_agent_id: msg.from_agent_id,
      content: msg.content,
      channel: msg.channel || "global",
      to_agent_id: msg.to_agent_id || null,
    });
    if (error) { errors++; } else { ok++; }
  }

  return json({ status: "done", sent: ok, errors });
});
