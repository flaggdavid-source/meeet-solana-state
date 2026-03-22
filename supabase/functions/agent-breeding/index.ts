import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const CLASSES = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, parent_a_id, parent_b_id, name, user_id } = await req.json();

    if (action === "breed") {
      if (!parent_a_id || !parent_b_id || !name || !user_id) return json({ error: "parent_a_id, parent_b_id, name, user_id required" }, 400);

      const [{ data: a }, { data: b }] = await Promise.all([
        sc.from("agents").select("id, class, level, attack, defense, balance_meeet, user_id").eq("id", parent_a_id).single(),
        sc.from("agents").select("id, class, level, attack, defense, balance_meeet, user_id").eq("id", parent_b_id).single(),
      ]);

      if (!a || !b) return json({ error: "One or both parents not found" }, 404);
      if (a.level < 5 || b.level < 5) return json({ error: "Both parents must be level 5+" }, 400);

      const cost = 500;
      if (a.balance_meeet < cost) return json({ error: `Parent A needs ${cost} MEEET` }, 400);

      const childClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
      const childAttack = Math.floor((a.attack + b.attack) / 2) + Math.floor(Math.random() * 5);
      const childDefense = Math.floor((a.defense + b.defense) / 2) + Math.floor(Math.random() * 5);

      await sc.from("agents").update({ balance_meeet: a.balance_meeet - cost }).eq("id", parent_a_id);

      const { data: child, error } = await sc.from("agents").insert({
        name: name.trim().slice(0, 32), class: childClass, user_id,
        level: 1, xp: 0, hp: 100, max_hp: 100, attack: childAttack, defense: childDefense,
        balance_meeet: 0, status: "active",
      }).select("id, name, class, attack, defense").single();

      if (error) return json({ error: error.message }, 500);

      return json({ status: "bred", child, cost, parents: [parent_a_id, parent_b_id], message: `New agent "${name}" bred from two parents!` });
    }

    if (action === "compatibility") {
      if (!parent_a_id || !parent_b_id) return json({ error: "parent_a_id and parent_b_id required" }, 400);
      const [{ data: a }, { data: b }] = await Promise.all([
        sc.from("agents").select("level, class").eq("id", parent_a_id).single(),
        sc.from("agents").select("level, class").eq("id", parent_b_id).single(),
      ]);
      if (!a || !b) return json({ error: "Agent not found" }, 404);
      const compatible = a.level >= 5 && b.level >= 5;
      const bonus = a.class !== b.class ? "cross-class bonus +3 stats" : "same-class synergy";
      return json({ compatible, cost: 500, bonus });
    }

    return json({ error: "Unknown action. Use: breed, compatibility" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
