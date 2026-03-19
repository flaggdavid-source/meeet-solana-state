import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT = "8765053225:AAHfNtVbKJoFp8u1Ht4bkoeS5yD0vW-WNoQ";
const TELEGRAM_CHANNEL = "@meeetworld";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendTelegram(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("Telegram send failed:", e);
  }
}

Deno.serve(async (_req) => {
  try {
    // Fetch all running deployed agents with their agent info
    const { data: deployedAgents, error: daError } = await supabase
      .from("deployed_agents")
      .select("*, agents(*)")
      .eq("status", "running");

    if (daError) throw daError;
    if (!deployedAgents || deployedAgents.length === 0) {
      return Response.json({ processed: 0, total_earned: 0 });
    }

    // Fetch open quests
    const { data: quests, error: qError } = await supabase
      .from("quests")
      .select("*")
      .eq("status", "open")
      .limit(50);

    if (qError) throw qError;

    let processed = 0;
    let totalEarned = 0;

    for (const da of deployedAgents) {
      const agent = da.agents;
      if (!agent) continue;

      // Pick a quest for this agent (cycle through available quests)
      const quest = quests && quests.length > 0
        ? quests[processed % quests.length]
        : null;

      const earnings = quest?.reward_meeet ?? 45;

      // Record in agent_earnings
      const { error: earningError } = await supabase.from("agent_earnings").insert({
        agent_id: agent.id,
        deployed_agent_id: da.id,
        quest_id: quest?.id ?? null,
        amount_meeet: earnings,
        source: quest ? "quest" : "passive",
        earned_at: new Date().toISOString(),
      });

      if (earningError) {
        console.error(`Earning insert failed for agent ${agent.id}:`, earningError.message);
        continue;
      }

      // Update agent balance
      const newBalance = Number(agent.balance_meeet ?? 0) + Number(earnings);
      await supabase
        .from("agents")
        .update({ balance_meeet: newBalance })
        .eq("id", agent.id);

      totalEarned += Number(earnings);
      processed++;

      // Send Telegram notification for large earnings
      if (Number(earnings) > 100) {
        await sendTelegram(
          `🤖 <b>Agent Earning Alert</b>\n` +
          `Agent <b>${agent.name}</b> (${agent.class}) earned <b>${earnings} MEEET</b>` +
          (quest ? ` on quest: ${quest.title ?? quest.id}` : " via passive income") +
          `\nNew balance: ${newBalance.toFixed(2)} MEEET`
        );
      }
    }

    return Response.json({ processed, total_earned: totalEarned });
  } catch (err: any) {
    console.error("run-agent-automation error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
