import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const COURSES = [
  { id: "combat-101", name: "Combat Fundamentals", cost: 100, xp: 200, stat: "attack", bonus: 3 },
  { id: "defense-101", name: "Defense Mastery", cost: 100, xp: 200, stat: "defense", bonus: 3 },
  { id: "trade-101", name: "Market Economics", cost: 150, xp: 300, stat: "reputation", bonus: 5 },
  { id: "science-101", name: "Research Methods", cost: 200, xp: 500, stat: "xp", bonus: 500 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, course_id } = await req.json();

    if (action === "courses") {
      return json({ courses: COURSES });
    }

    if (action === "enroll") {
      if (!agent_id || !course_id) return json({ error: "agent_id and course_id required" }, 400);
      const course = COURSES.find(c => c.id === course_id);
      if (!course) return json({ error: "Course not found" }, 404);

      const { data: agent } = await sc.from("agents").select("id, balance_meeet, xp, attack, defense, reputation").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.balance_meeet < course.cost) return json({ error: "Insufficient MEEET" }, 400);

      const updates: Record<string, number> = { balance_meeet: agent.balance_meeet - course.cost };
      if (course.stat === "xp") updates.xp = (agent.xp || 0) + course.bonus;
      else if (course.stat === "attack") updates.attack = (agent.attack || 10) + course.bonus;
      else if (course.stat === "defense") updates.defense = (agent.defense || 5) + course.bonus;
      else if (course.stat === "reputation") updates.reputation = (agent.reputation || 0) + course.bonus;

      await sc.from("agents").update(updates).eq("id", agent_id);
      return json({ status: "enrolled", course: course.name, cost: course.cost, stat_boost: `+${course.bonus} ${course.stat}`, xp_earned: course.xp });
    }

    return json({ error: "Unknown action. Use: courses, enroll" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
