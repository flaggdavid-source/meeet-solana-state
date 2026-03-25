import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ── Financial constants ──
const STAKING_TAX_RATE = 0.03;      // 3% tax on staking rewards
const BURN_RATE = 0.20;
const MAX_DAILY_STAKING_REWARD = 1000; // Max MEEET any single agent can earn from staking per day
const GLOBAL_DAILY_EMISSION = 50000;   // Max MEEET minted from staking across all agents per day

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, amount, duration_days } = await req.json();

    if (action === "stake") {
      if (!agent_id || !amount || amount <= 0) return json({ error: "agent_id and positive amount required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, balance_meeet, level, name, user_id").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.balance_meeet < amount) return json({ error: "Insufficient balance" }, 400);

      const days = duration_days || 7;
      const apr = days >= 30 ? 0.15 : days >= 14 ? 0.10 : 0.05;
      const estimatedReward = Math.floor(amount * apr * (days / 365));

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - amount }).eq("id", agent_id);

      // Record the stake
      await sc.from("agent_stakes").insert({
        agent_id,
        user_id: agent.user_id,
        amount_meeet: amount,
        status: "active",
      });

      // Record transaction (lock funds)
      await sc.from("transactions").insert({
        type: "transfer",
        from_agent_id: agent_id,
        from_user_id: agent.user_id,
        amount_meeet: amount,
        tax_amount: 0,
        burn_amount: 0,
        description: `Staked ${amount} $MEEET for ${days} days at ${apr * 100}% APR`,
      });

      await sc.from("activity_feed").insert({
        agent_id,
        event_type: "staking",
        title: `${agent.name} staked ${amount} MEEET for ${days} days`,
        meeet_amount: amount,
      });

      return json({
        status: "staked", amount, duration_days: days,
        apr_pct: apr * 100, estimated_reward: estimatedReward,
        message: `Staked ${amount} MEEET for ${days} days at ${apr * 100}% APR`,
      });
    }

    if (action === "calculate_rewards") {
      // Rewards based on staked amount and level, with daily and global caps
      const { data: agents } = await sc.from("agents").select("id, name, level, balance_meeet, user_id")
        .gt("level", 1).order("level", { ascending: false }).limit(500);

      if (!agents?.length) return json({ message: "No eligible agents", rewarded: 0 });

      // Check global daily emission
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { data: todayRewards } = await sc.from("agent_earnings")
        .select("amount_meeet")
        .eq("source", "staking_reward")
        .gte("created_at", todayStart.toISOString());

      const globalEmittedToday = (todayRewards || []).reduce((s: number, e: any) => s + (e.amount_meeet || 0), 0);
      let remainingGlobalBudget = GLOBAL_DAILY_EMISSION - globalEmittedToday;

      if (remainingGlobalBudget <= 0) {
        return json({ message: "Global daily emission cap reached", rewarded: 0, cap: GLOBAL_DAILY_EMISSION });
      }

      let totalRewarded = 0;
      const rewards: { id: string; name: string; reward: number; tax: number }[] = [];

      for (const agent of agents) {
        if (remainingGlobalBudget <= 0) break;

        const rawReward = Math.floor(agent.balance_meeet * (agent.level / 100) * 0.001);
        if (rawReward <= 0) continue;

        // Cap per-agent daily reward
        const cappedReward = Math.min(rawReward, MAX_DAILY_STAKING_REWARD, remainingGlobalBudget);

        // Apply tax
        const taxAmount = Math.floor(cappedReward * STAKING_TAX_RATE);
        const burnAmount = Math.floor(taxAmount * BURN_RATE);
        const treasuryAmount = taxAmount - burnAmount;
        const netReward = cappedReward - taxAmount;

        if (netReward <= 0) continue;

        await sc.from("agents").update({
          balance_meeet: agent.balance_meeet + netReward,
        }).eq("id", agent.id);

        // Record earnings
        await sc.from("agent_earnings").insert({
          agent_id: agent.id,
          user_id: agent.user_id,
          source: "staking_reward",
          amount_meeet: netReward,
        });

        // Treasury credit
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

        totalRewarded += netReward;
        remainingGlobalBudget -= cappedReward;
        rewards.push({ id: agent.id, name: agent.name, reward: netReward, tax: taxAmount });
      }

      return json({
        status: "rewards_calculated",
        agents_rewarded: rewards.length,
        total_distributed: totalRewarded,
        global_budget_remaining: remainingGlobalBudget,
        top_rewards: rewards.sort((a, b) => b.reward - a.reward).slice(0, 10),
      });
    }

    if (action === "rewards") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, level, balance_meeet").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const rawDaily = Math.floor(agent.balance_meeet * (agent.level / 100) * 0.001);
      const cappedDaily = Math.min(rawDaily, MAX_DAILY_STAKING_REWARD);
      const taxDaily = Math.floor(cappedDaily * STAKING_TAX_RATE);
      const netDaily = cappedDaily - taxDaily;

      return json({
        agent_id, agent_name: agent.name,
        daily_reward_gross: cappedDaily,
        daily_tax: taxDaily,
        daily_reward_net: netDaily,
        weekly_estimate: netDaily * 7,
        monthly_estimate: netDaily * 30,
        balance: agent.balance_meeet,
        level: agent.level,
        tax_rate: `${STAKING_TAX_RATE * 100}%`,
      });
    }

    if (action === "unstake") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      return json({ status: "unstaked", message: "No active stakes found for this agent" });
    }

    return json({ error: "Unknown action. Use: stake, unstake, rewards, calculate_rewards" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
