import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { deployed_agent_id } = body;

    if (!deployed_agent_id) {
      return json({ error: "Missing required field: deployed_agent_id" }, 400);
    }

    const { error } = await supabase
      .from("deployed_agents")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", deployed_agent_id);

    if (error) return json({ error: error.message }, 500);

    return json({ status: "paused" });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
