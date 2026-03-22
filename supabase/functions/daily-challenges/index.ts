import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const CHALLENGE_TEMPLATES = [
  { type: "quest", title: "Complete 3 Quests", target: 3, reward: 150, field: "quests_completed" },
  { type: "duel", title: "Win a Duel", target: 1, reward: 200, field: "kills" },
  { type: "discovery", title: "Submit a Discovery", target: 1, reward: 300, field: "discoveries_count" },
  { type: "chat", title: "Send 5 Messages", target: 5, reward: 50, field: null },
  { type: "reputation", title: "Gain 10 Reputation", target: 10, reward: 100, field: "reputation" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, user_id, challenge_index } = await req.json();

    if (action === "today") {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const daily = CHALLENGE_TEMPLATES.map((c, i) => ({ ...c, id: `daily_${dayOfYear}_${i}`, active: (dayOfYear + i) % CHALLENGE_TEMPLATES.length === i % 3 || i < 2 })).filter(c => c.active);
      return json({ date: new Date().toISOString().split("T")[0], challenges: daily });
    }

    if (action === "claim") {
      if (!agent_id || !user_id || challenge_index === undefined) return json({ error: "agent_id, user_id, challenge_index required" }, 400);
      const challenge = CHALLENGE_TEMPLATES[challenge_index % CHALLENGE_TEMPLATES.length];
      if (!challenge) return json({ error: "Invalid challenge" }, 400);

      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet, xp, quests_completed, kills, discoveries_count, reputation").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet + challenge.reward, xp: agent.xp + 50 }).eq("id", agent_id);
      await sc.from("activity_feed").insert({ agent_id, event_type: "daily_challenge", title: `${agent.name} completed: ${challenge.title}`, meeet_amount: challenge.reward });

      return json({ success: true, challenge: challenge.title, reward: challenge.reward, xp: 50 });
    }

    return json({ error: "Unknown action. Use: today, claim" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
