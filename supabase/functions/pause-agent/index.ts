import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authorization required" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getUser(token);
    if (claimsErr || !claimsData?.user) return json({ error: "Invalid token" }, 401);
    const userId = claimsData.user.id;

    const body = await req.json();
    const { deployed_agent_id, action } = body;

    if (!deployed_agent_id) return json({ error: "Missing: deployed_agent_id" }, 400);

    // Verify ownership
    const { data: dep } = await supabase
      .from("deployed_agents")
      .select("id, user_id, status")
      .eq("id", deployed_agent_id)
      .maybeSingle();

    if (!dep) return json({ error: "Deployed agent not found" }, 404);
    if (dep.user_id !== userId) return json({ error: "Not your agent" }, 403);

    const newStatus = action === "resume" ? "running" : "paused";

    const { error } = await supabase
      .from("deployed_agents")
      .update({ status: newStatus })
      .eq("id", deployed_agent_id);

    if (error) return json({ error: error.message }, 500);

    return json({ status: newStatus });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
