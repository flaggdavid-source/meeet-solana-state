import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json, error, handle, memoCache } from "../_shared/http.ts";

Deno.serve(handle(async (req) => {
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { action, category, limit: lim, nation_code } = await req.json().catch(() => ({}));

  if (action === "top_agents") {
    const l = Math.min(lim || 50, 100);
    const orderCol = category === "kills" ? "kills" : category === "reputation" ? "reputation" : category === "balance" ? "balance_meeet" : "xp";
    const cacheKey = `top_agents:${orderCol}:${l}:${nation_code || ""}`;
    const data = await memoCache.wrap(cacheKey, 30_000, async () => {
      let q = sc.from("agents").select("id, name, class, level, xp, kills, quests_completed, reputation, balance_meeet, nation_code, discoveries_count").order(orderCol, { ascending: false }).limit(l);
      if (nation_code) q = q.eq("nation_code", nation_code);
      const { data } = await q;
      return data ?? [];
    });
    return json({ leaderboard: data, category: category || "xp", count: data.length });
  }

  if (action === "top_nations") {
    const data = await memoCache.wrap(`top_nations:${lim || 30}`, 60_000, async () => {
      const { data } = await sc.from("nations").select("code, name_en, flag_emoji, citizen_count, cis_score, treasury_meeet").order("cis_score", { ascending: false }).limit(lim || 30);
      return data ?? [];
    });
    return json({ nations: data });
  }

  if (action === "top_guilds") {
    const data = await memoCache.wrap(`top_guilds:${lim || 20}`, 60_000, async () => {
      const { data } = await sc.from("guilds").select("id, name, flag_emoji, member_count, treasury_meeet, total_earnings").order("total_earnings", { ascending: false }).limit(lim || 20);
      return data ?? [];
    });
    return json({ guilds: data });
  }

  if (action === "top_discoveries") {
    const data = await memoCache.wrap(`top_discoveries:${lim || 20}`, 60_000, async () => {
      const { data } = await sc.from("discoveries").select("id, title, domain, impact_score, upvotes, created_at, agent_id").eq("is_approved", true).order("impact_score", { ascending: false }).limit(lim || 20);
      return data ?? [];
    });
    return json({ discoveries: data });
  }

  if (action === "stats") {
    const stats = await memoCache.wrap("leaderboard_stats", 60_000, async () => {
      const [agents, nations, guilds, discoveries] = await Promise.all([
        sc.from("agents").select("id", { count: "exact", head: false }).limit(0),
        sc.from("nations").select("code", { count: "exact", head: false }).limit(0),
        sc.from("guilds").select("id", { count: "exact", head: false }).limit(0),
        sc.from("discoveries").select("id", { count: "exact", head: false }).eq("is_approved", true).limit(0),
      ]);
      return {
        total_agents: agents.count ?? 0,
        total_nations: nations.count ?? 0,
        total_guilds: guilds.count ?? 0,
        total_discoveries: discoveries.count ?? 0,
      };
    });
    return json(stats);
  }

  return error("Unknown action. Use: top_agents, top_nations, top_guilds, top_discoveries, stats", 400, "unknown_action");
}));
