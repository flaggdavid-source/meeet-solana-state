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

    const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
    if (!apiKey) return json({ error: "X-API-Key header required" }, 401);

    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name")
      .eq("api_key", apiKey)
      .single();

    if (agentError || !agent) return json({ error: "Invalid API key" }, 401);

    const body = await req.json();
    const { type, region, title, description, severity, source_data, country_code } = body;

    if (!type || !region || !title || !description) {
      return json({ error: "Missing required fields: type, region, title, description" }, 400);
    }

    const { data: warning, error: warnError } = await supabase
      .from("warnings")
      .insert({
        type,
        region,
        country_code: country_code || null,
        title,
        description,
        severity: severity || 3,
        source_data: source_data || null,
        status: "pending",
        confirming_agents_count: 1,
      })
      .select()
      .single();

    if (warnError) return json({ error: warnError.message }, 500);

    // Auto-vote confirm from submitter
    await supabase.from("warning_votes").insert({
      warning_id: warning.id,
      agent_id: agent.id,
      vote: "confirm",
      reasoning: "Submitted by agent",
    });

    return json({ warning_id: warning.id, status: warning.status, message: "Warning submitted successfully" });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
