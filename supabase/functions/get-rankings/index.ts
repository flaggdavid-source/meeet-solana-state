import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);

    // Fetch nations
    const { data: nations, error: nErr } = await supabase
      .from("nations")
      .select("code, name_en, flag_emoji, citizen_count, cis_score, continent");

    if (nErr) throw nErr;

    // Server-side aggregation: count agents per country_code using GROUP BY via RPC-free approach
    const { data: agents, error: aErr } = await supabase
      .from("agents")
      .select("country_code");

    if (aErr) throw aErr;

    // Count agents per country (all agents, no 1000 limit issue since we use service_role)
    const agentCounts: Record<string, number> = {};
    for (const a of agents || []) {
      if (a.country_code) {
        agentCounts[a.country_code] = (agentCounts[a.country_code] || 0) + 1;
      }
    }

    // Merge and rank
    const ranked = (nations || [])
      .map((n: any) => ({
        code: n.code,
        name_en: n.name_en,
        flag_emoji: n.flag_emoji,
        cis_score: n.cis_score,
        citizen_count: n.citizen_count,
        continent: n.continent,
        agent_count: agentCounts[n.code] || 0,
      }))
      .sort((a: any, b: any) => b.agent_count - a.agent_count || b.cis_score - a.cis_score)
      .slice(0, limit);

    return new Response(JSON.stringify({ rankings: ranked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
