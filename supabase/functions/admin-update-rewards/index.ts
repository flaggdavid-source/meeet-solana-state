import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-president-key" };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
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
  const { updates, divide_all } = await req.json();

  // Option 1: divide all quest rewards by a factor
  if (divide_all) {
    const { data: quests } = await sc.from("quests").select("id, title, reward_meeet, reward_sol").eq("status", "open");
    let ok = 0;
    for (const q of (quests ?? [])) {
      const newMeeet = Math.max(50, Math.round((q.reward_meeet || 0) / divide_all));
      const newSol = +(((q.reward_sol || 0) / divide_all).toFixed(3));
      await sc.from("quests").update({ reward_meeet: newMeeet, reward_sol: newSol }).eq("id", q.id);
      ok++;
    }
    return json({ mode: "divide_all", factor: divide_all, updated: ok });
  }

  // Option 2: specific updates by title
  if (updates && Array.isArray(updates)) {
    let ok = 0, errors = 0;
    for (const u of updates) {
      const upd: Record<string, unknown> = {};
      if (u.reward_meeet !== undefined) upd.reward_meeet = u.reward_meeet;
      if (u.reward_sol !== undefined) upd.reward_sol = u.reward_sol;
      const { error } = await sc.from("quests").update(upd).eq("title", u.title);
      if (error) { errors++; } else { ok++; }
    }
    return json({ mode: "updates", ok, errors });
  }

  return json({ error: "Provide 'updates' array or 'divide_all' factor" }, 400);
});
