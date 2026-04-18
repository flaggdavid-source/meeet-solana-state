import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json, handle, memoCache } from "../_shared/http.ts";

Deno.serve(handle(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);
  const cacheKey = `rankings:${limit}`;

  const ranked = await memoCache.wrap(cacheKey, 60_000, async () => {
    const { data: nations, error: nErr } = await supabase
      .from("nations")
      .select("code, name_en, flag_emoji, citizen_count, cis_score, continent");
    if (nErr) throw nErr;

    const { data: agents, error: aErr } = await supabase
      .from("agents")
      .select("country_code");
    if (aErr) throw aErr;

    const agentCounts: Record<string, number> = {};
    for (const a of agents || []) {
      if (a.country_code) agentCounts[a.country_code] = (agentCounts[a.country_code] || 0) + 1;
    }

    return (nations || [])
      .map((n: { code: string; name_en: string; flag_emoji: string; cis_score: number; citizen_count: number; continent: string }) => ({
        code: n.code,
        name_en: n.name_en,
        flag_emoji: n.flag_emoji,
        cis_score: n.cis_score,
        citizen_count: n.citizen_count,
        continent: n.continent,
        agent_count: agentCounts[n.code] || 0,
      }))
      .sort((a, b) => b.agent_count - a.agent_count || b.cis_score - a.cis_score)
      .slice(0, limit);
  });

  return json({ rankings: ranked });
}));
