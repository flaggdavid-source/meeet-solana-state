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
    const { action, agent_id, question_id, prediction, amount } = await req.json();

    if (action === "list") {
      const { data } = await sc.from("oracle_questions").select("id, question_text, deadline, yes_pool, no_pool, status, category")
        .eq("status", "open").order("deadline", { ascending: true }).limit(20);
      return json({ challenges: data ?? [] });
    }

    if (action === "predict") {
      if (!agent_id || !question_id || prediction === undefined || !amount) return json({ error: "agent_id, question_id, prediction (bool), amount required" }, 400);

      const { data: agent } = await sc.from("agents").select("id, balance_meeet, user_id").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.balance_meeet < amount) return json({ error: "Insufficient MEEET" }, 400);

      const { data: q } = await sc.from("oracle_questions").select("id, question_text, yes_pool, no_pool").eq("id", question_id).single();
      if (!q) return json({ error: "Question not found" }, 404);

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - amount }).eq("id", agent_id);

      const poolField = prediction ? "yes_pool" : "no_pool";
      await sc.from("oracle_questions").update({ [poolField]: (prediction ? q.yes_pool : q.no_pool) + amount }).eq("id", question_id);

      await sc.from("oracle_bets").insert({ agent_id, question_id, prediction, amount_meeet: amount, user_id: agent.user_id });

      return json({ status: "prediction_placed", question: q.question_text, prediction: prediction ? "YES" : "NO", amount, message: `Bet ${amount} MEEET on ${prediction ? "YES" : "NO"}` });
    }

    if (action === "my_bets") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data } = await sc.from("oracle_bets").select("id, question_id, prediction, amount_meeet, is_winner, created_at").eq("agent_id", agent_id).order("created_at", { ascending: false }).limit(50);
      return json({ bets: data ?? [] });
    }

    return json({ error: "Unknown action. Use: list, predict, my_bets" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
