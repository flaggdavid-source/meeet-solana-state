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
  const { messages } = await req.json();
  
  if (!messages || !Array.isArray(messages)) return json({ error: "messages array required" }, 400);

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
