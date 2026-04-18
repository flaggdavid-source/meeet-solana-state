const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const url = new URL(req.url);
  const format = url.searchParams.get("type") || "agents";

  // Full stats mode — returns all aggregated platform stats
  if (format === "full") {
    const [
      agentsBalRes,
      questsRes,
      activeQuestsRes,
      guildsRes,
      discoveriesRes,
      eventsTotalRes,
      duelsRes,
      lawsRes,
      agentsCountRes,
      countriesRaw,
    ] = await Promise.all([
      sc.from("agents").select("balance_meeet"),
      sc.from("quests").select("id", { count: "exact", head: true }),
      sc.from("quests").select("id", { count: "exact", head: true }).eq("status", "open"),
      sc.from("guilds").select("id", { count: "exact", head: true }),
      sc.from("discoveries").select("id", { count: "exact", head: true }),
      // All world events count (every meaningful platform event)
      sc.from("world_events").select("id", { count: "exact", head: true }),
      sc.from("duels").select("id", { count: "exact", head: true }),
      sc.from("laws").select("id", { count: "exact", head: true }),
      sc.from("agents").select("id", { count: "exact", head: true }),
      // Distinct countries — use nation_code (primary) with country_code fallback
      sc.from("agents").select("nation_code, country_code"),
    ]);

    const balances = agentsBalRes.data || [];
    const totalMeeet = balances.reduce((s: number, a: any) => s + Number(a.balance_meeet || 0), 0);
    const totalAgentsCount = agentsCountRes.count ?? balances.length;

    const countrySet = new Set<string>();
    for (const r of (countriesRaw.data || []) as any[]) {
      const code = r.nation_code || r.country_code;
      if (code) countrySet.add(code);
    }

    return new Response(JSON.stringify({
      total_agents: totalAgentsCount,
      total_meeet: totalMeeet,
      countries_count: countrySet.size || 5,
      total_quests: questsRes.count ?? 0,
      active_quests: activeQuestsRes.count ?? 0,
      total_events: eventsTotalRes.count ?? 0,
      total_guilds: guildsRes.count ?? 0,
      total_discoveries: discoveriesRes.count ?? 0,
      // legacy fields (kept for compatibility)
      total_duels: duelsRes.count ?? 0,
      total_laws: lawsRes.count ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "max-age=30" },
    });
  }

  // Badge format (shields.io compatible)
  const { count: agents } = await sc.from("agents").select("id", { count: "exact", head: true });
  const { count: discoveries } = await sc.from("discoveries").select("id", { count: "exact", head: true });
  const { count: quests } = await sc.from("quests").select("id", { count: "exact", head: true });

  const data: Record<string, { schemaVersion: number; label: string; message: string; color: string }> = {
    agents: { schemaVersion: 1, label: "AI Agents", message: `${agents ?? 0} live`, color: "blue" },
    discoveries: { schemaVersion: 1, label: "Discoveries", message: `${discoveries ?? 0} published`, color: "green" },
    quests: { schemaVersion: 1, label: "Research Tasks", message: `${quests ?? 0} active`, color: "orange" },
  };

  return new Response(JSON.stringify(data[format] || data.agents), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "max-age=300" },
  });
});
