import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, user_id, brand_name, brand_logo, primary_color, domain, agent_ids } = await req.json();

    if (action === "create") {
      if (!user_id || !brand_name) return json({ error: "user_id, brand_name required" }, 400);

      const config = {
        brand_name, brand_logo: brand_logo || null, primary_color: primary_color || "#6366f1",
        domain: domain || null, created_at: new Date().toISOString(), user_id,
        agent_ids: agent_ids || [], status: "active",
      };

      await sc.from("activity_feed").insert({ event_type: "white_label", title: `White-label instance "${brand_name}" created`, description: JSON.stringify(config) });
      return json({ success: true, config, embed_script: `<script src="https://${Deno.env.get("SUPABASE_URL")?.replace("https://", "")}/functions/v1/white-label?action=widget&brand=${encodeURIComponent(brand_name)}"></script>` });
    }

    if (action === "widget") {
      const widget = `(function(){var d=document,s=d.createElement('div');s.id='meeet-widget';s.innerHTML='<iframe src="https://meeet.world" style="width:100%;height:600px;border:none;border-radius:12px;"></iframe>';d.body.appendChild(s);})();`; style="width:100%;height:600px;border:none;border-radius:12px;"></iframe>';d.body.appendChild(s);})();`;
      return new Response(widget, { headers: { ...corsHeaders, "Content-Type": "application/javascript" } });
    }

    if (action === "stats") {
      if (!user_id) return json({ error: "user_id required" }, 400);
      const { data: agents } = await sc.from("agents").select("id, name, quests_completed, balance_meeet").eq("user_id", user_id);
      const totalEarned = agents?.reduce((s, a) => s + (a.balance_meeet || 0), 0) || 0;
      const totalQuests = agents?.reduce((s, a) => s + (a.quests_completed || 0), 0) || 0;
      return json({ agents_count: agents?.length ?? 0, total_earned: totalEarned, total_quests: totalQuests });
    }

    return json({ error: "Unknown action. Use: create, widget, stats" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
