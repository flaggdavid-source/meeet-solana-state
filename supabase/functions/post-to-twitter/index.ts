import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { action = "auto_post", discovery_id, user_id } = body;

    // ── Get top discovery from last 24h ──
    if (action === "auto_post" || action === "post_now") {
      let discovery;

      if (discovery_id) {
        const { data } = await sc
          .from("discoveries")
          .select("id, title, description, impact_score, agent_id")
          .eq("id", discovery_id)
          .single();
        discovery = data;
      } else {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data } = await sc
          .from("discoveries")
          .select("id, title, description, impact_score, agent_id")
          .gte("created_at", since)
          .order("impact_score", { ascending: false })
          .limit(1)
          .maybeSingle();
        discovery = data;
      }

      if (!discovery) {
        return json({ status: "no_discovery", message: "No discoveries found to post" });
      }

      // Check if already posted
      const { data: existing } = await sc
        .from("social_posts")
        .select("id")
        .eq("discovery_id", discovery.id)
        .eq("platform", "twitter")
        .eq("status", "posted")
        .maybeSingle();

      if (existing) {
        return json({ status: "already_posted", message: "This discovery was already posted" });
      }

      // Format tweet
      const summary = discovery.description
        ? discovery.description.substring(0, 160)
        : "New AI breakthrough";
      const tweet = `🔬 ${discovery.title}\n\n${summary}…\n\n🌐 meeet.world/discoveries\n\n#MEEET #AI #Solana #Web3`;

      // Insert as pending
      const { data: post, error: insertErr } = await sc
        .from("social_posts")
        .insert({
          discovery_id: discovery.id,
          platform: "twitter",
          post_content: tweet.substring(0, 280),
          status: "pending",
          created_by: user_id || null,
        })
        .select("id, post_content, status, created_at")
        .single();

      if (insertErr) {
        return json({ error: insertErr.message }, 500);
      }

      // Try to post via twitter-poster if account exists
      const { data: account } = await sc
        .from("twitter_accounts")
        .select("id, username")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (account) {
        // Call twitter-poster to actually post
        const posterUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twitter-poster`;
        const posterRes = await fetch(posterUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "post",
            account_username: account.username,
            text: tweet.substring(0, 280),
          }),
        });
        const posterData = await posterRes.json();

        if (posterRes.ok && posterData.result?.status === 201) {
          await sc
            .from("social_posts")
            .update({
              status: "posted",
              posted_at: new Date().toISOString(),
              engagement_metrics: { tweet_id: posterData.result?.data?.data?.id },
            })
            .eq("id", post.id);

          return json({
            status: "posted",
            post: { ...post, status: "posted" },
            tweet_id: posterData.result?.data?.data?.id,
          });
        } else {
          await sc
            .from("social_posts")
            .update({
              status: "failed",
              error_message: JSON.stringify(posterData).substring(0, 500),
            })
            .eq("id", post.id);

          return json({
            status: "queued_failed",
            post,
            error: "Twitter API call failed, post saved as draft",
          });
        }
      }

      // No active Twitter account — keep as pending draft
      return json({
        status: "draft",
        post,
        message: "No active Twitter account configured. Post saved as draft.",
      });
    }

    // ── Preview next post ──
    if (action === "preview") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: discovery } = await sc
        .from("discoveries")
        .select("id, title, description, impact_score")
        .gte("created_at", since)
        .order("impact_score", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!discovery) return json({ preview: null, message: "No discoveries to post" });

      const summary = discovery.description
        ? discovery.description.substring(0, 160)
        : "New AI breakthrough";
      const tweet = `🔬 ${discovery.title}\n\n${summary}…\n\n🌐 meeet.world/discoveries\n\n#MEEET #AI #Solana #Web3`;

      return json({ preview: { discovery, tweet: tweet.substring(0, 280) } });
    }

    // ── Get recent posts ──
    if (action === "recent") {
      const { data } = await sc
        .from("social_posts")
        .select("id, discovery_id, platform, post_content, posted_at, status, engagement_metrics, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return json({ posts: data ?? [] });
    }

    // ── Stats ──
    if (action === "stats") {
      const { count: total } = await sc.from("social_posts").select("id", { count: "exact" }).limit(0);
      const { count: posted } = await sc.from("social_posts").select("id", { count: "exact" }).eq("status", "posted").limit(0);
      const { count: failed } = await sc.from("social_posts").select("id", { count: "exact" }).eq("status", "failed").limit(0);
      const { count: pending } = await sc.from("social_posts").select("id", { count: "exact" }).eq("status", "pending").limit(0);
      return json({ stats: { total, posted, failed, pending } });
    }

    return json({ error: "Unknown action. Use: auto_post, post_now, preview, recent, stats" }, 400);
  } catch (e) {
    return json({ error: "Internal server error", details: e?.message }, 500);
  }
});
