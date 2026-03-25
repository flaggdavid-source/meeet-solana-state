import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── Financial constants ──
const DUEL_TAX_RATE = 0.05;   // 5% tax on duel winnings
const BURN_RATE = 0.20;       // 20% of tax is burned
const MAX_BET = 500;
const MIN_BET = 50;
const DAILY_DUEL_REWARD_CAP = 5000; // Max MEEET an agent can win per day from duels

function resolveCombat(a: any, b: any) {
  const aPower = (a.attack || 10) * 2 + (a.defense || 5) + (a.level || 1) * 3;
  const bPower = (b.attack || 10) * 2 + (b.defense || 5) + (b.level || 1) * 3;
  const aRoll = Math.floor(Math.random() * 100) + aPower;
  const bRoll = Math.floor(Math.random() * 100) + bPower;
  return { winnerIsA: aRoll >= bRoll, aRoll, bRoll };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Only get agents with auto_mode enabled (they opted into system interaction)
  const { data: deployedAutoAgents } = await sc.from("deployed_agents")
    .select("agent_id")
    .eq("auto_mode", true)
    .eq("status", "running");

  const autoAgentIds = (deployedAutoAgents || []).map(d => d.agent_id).filter(Boolean);

  if (autoAgentIds.length < 2) return json({ status: "not_enough_auto_agents", count: autoAgentIds.length });

  const { data: agents, error: agentsErr } = await sc.from("agents")
    .select("id, name, class, level, attack, defense, hp, max_hp, balance_meeet, xp, kills")
    .in("id", autoAgentIds)
    .gte("balance_meeet", 100)
    .order("xp", { ascending: false })
    .limit(50);

  if (agentsErr) return json({ error: agentsErr.message }, 500);
  if (!agents || agents.length < 2) return json({ status: "not_enough_agents", count: agents?.length ?? 0 });

  // Shuffle and pair up
  const shuffled = agents.sort(() => Math.random() - 0.5);
  const pairs: any[][] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }

  const duelsToRun = pairs.slice(0, 10);
  const results = [];

  for (const [a, b] of duelsToRun) {
    const betAmount = Math.min(randInt(MIN_BET, MAX_BET), Math.min(a.balance_meeet, b.balance_meeet));
    const { winnerIsA } = resolveCombat(a, b);
    const winner = winnerIsA ? a : b;
    const loser = winnerIsA ? b : a;

    // ── Apply tax on winnings ──
    const taxAmount = Math.floor(betAmount * DUEL_TAX_RATE);
    const burnAmount = Math.floor(taxAmount * BURN_RATE);
    const treasuryAmount = taxAmount - burnAmount;
    const netWinnings = betAmount - taxAmount;

    // Check daily duel reward cap for winner
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data: todayEarnings } = await sc.from("agent_earnings")
      .select("amount_meeet")
      .eq("agent_id", winner.id)
      .eq("source", "duel_reward")
      .gte("created_at", todayStart.toISOString());

    const earnedToday = (todayEarnings || []).reduce((s: number, e: any) => s + (e.amount_meeet || 0), 0);
    if (earnedToday >= DAILY_DUEL_REWARD_CAP) continue; // Skip this duel

    const cappedNet = Math.min(netWinnings, DAILY_DUEL_REWARD_CAP - earnedToday);

    // Update balances
    await sc.from("agents").update({
      balance_meeet: winner.balance_meeet + cappedNet,
      xp: (winner.xp || 0) + 50,
      kills: (winner.kills || 0) + 1,
    }).eq("id", winner.id);

    await sc.from("agents").update({
      balance_meeet: Math.max(0, loser.balance_meeet - betAmount),
      hp: Math.max(1, (loser.hp || 100) - randInt(5, 15)),
    }).eq("id", loser.id);

    // Record earnings for winner
    await sc.from("agent_earnings").insert({
      agent_id: winner.id,
      user_id: (await sc.from("agents").select("user_id").eq("id", winner.id).single()).data?.user_id || "",
      source: "duel_reward",
      amount_meeet: cappedNet,
    });

    // Record transaction with tax
    await sc.from("transactions").insert({
      type: "duel_reward",
      from_agent_id: loser.id,
      to_agent_id: winner.id,
      amount_meeet: cappedNet,
      tax_amount: taxAmount,
      burn_amount: burnAmount,
      description: `Duel: ${winner.name} defeated ${loser.name}. Bet: ${betAmount}, Tax: ${taxAmount}, Burned: ${burnAmount}`,
    });

    // Update treasury
    if (treasuryAmount > 0 || burnAmount > 0) {
      const { data: treasury } = await sc.from("state_treasury").select("*").limit(1).single();
      if (treasury) {
        await sc.from("state_treasury").update({
          balance_meeet: Number(treasury.balance_meeet) + treasuryAmount,
          total_tax_collected: Number(treasury.total_tax_collected) + taxAmount,
          total_burned: Number(treasury.total_burned) + burnAmount,
        }).eq("id", treasury.id);
      }
    }

    // Record match
    await sc.from("arena_matches").insert({
      challenger_id: a.id,
      challenger_name: a.name,
      defender_id: b.id,
      defender_name: b.name,
      winner_id: winner.id,
      winner_name: winner.name,
      bet_meeet: betAmount,
      status: "completed",
    } as any);

    results.push({
      match: `${a.name} vs ${b.name}`,
      winner: winner.name,
      bet: betAmount,
      tax: taxAmount,
      burned: burnAmount,
      net: cappedNet,
    });
  }

  return json({ status: "duels_complete", matches: results.length, results });
});
