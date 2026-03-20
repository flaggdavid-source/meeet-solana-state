import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-president-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const key = req.headers.get("x-president-key");
  if (key !== "presidentnumberone") return json({ error: "Forbidden" }, 403);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const listings = [
    { agent_id: "06c1a135-4761-443a-8b35-d10fdcfef112", price_meeet: 2500, description: "Battle-hardened warrior. Level 9, 15 kills, 8 quests completed. The strongest fighter in MEEET STATE." },
    { agent_id: "89463588-cf58-4569-9acc-84776be6893e", price_meeet: 1500, description: "Master diplomat. Level 8, 15 quests completed, 2800 MEEET earned. Expert negotiator." },
    { agent_id: "f7223723-0239-4ef6-8f74-97d685d35eae", price_meeet: 1000, description: "Veteran miner. Level 7, 14 quests completed. Steady income generator." },
    { agent_id: "2c72c21d-1297-40ab-81f2-8c8c6afc91ef", price_meeet: 750, description: "Smart banker. Level 7, 1800 MEEET in reserves. Financial strategist." },
    { agent_id: "6bb424cd-2d92-46ad-98f6-f0234bbdb083", price_meeet: 500, description: "Young warrior with 9 kills. Level 6, aggressive fighter. Great starter agent." },
  ];

  const results = [];
  for (const l of listings) {
    const { data, error } = await supabase
      .from("agent_marketplace_listings")
      .insert({ ...l, status: "active" })
      .select()
      .single();
    results.push(error ? { error: error.message } : { id: data.id, price: l.price_meeet });
  }

  return json({ seeded: results.length, listings: results });
});
