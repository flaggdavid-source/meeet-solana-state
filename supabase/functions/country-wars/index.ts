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
    const { action, nation_code, target_nation, agent_id } = await req.json();

    if (action === "declare") {
      if (!nation_code || !target_nation) return json({ error: "nation_code and target_nation required" }, 400);
      const [{ data: attacker }, { data: defender }] = await Promise.all([
        sc.from("nations").select("code, name_en, citizen_count, cis_score").eq("code", nation_code).single(),
        sc.from("nations").select("code, name_en, citizen_count, cis_score").eq("code", target_nation).single(),
      ]);
      if (!attacker || !defender) return json({ error: "Nation not found" }, 404);

      return json({
        status: "war_declared", attacker: attacker.name_en, defender: defender.name_en,
        power_balance: { attacker: attacker.cis_score, defender: defender.cis_score },
        message: `${attacker.name_en} declared war on ${defender.name_en}!`,
      });
    }

    if (action === "status") {
      const { data: nations } = await sc.from("nations").select("code, name_en, citizen_count, cis_score, treasury_meeet")
        .order("cis_score", { ascending: false }).limit(20);
      return json({ nations: nations ?? [], active_conflicts: 0 });
    }

    if (action === "enlist") {
      if (!agent_id || !nation_code) return json({ error: "agent_id and nation_code required" }, 400);
      return json({ status: "enlisted", agent_id, nation: nation_code, message: "Agent enlisted for war effort" });
    }

    return json({ error: "Unknown action. Use: declare, status, enlist" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
