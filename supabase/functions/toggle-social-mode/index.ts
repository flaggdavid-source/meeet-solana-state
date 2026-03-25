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

// ── Financial constants ──
const SOCIAL_REWARD = 5;           // MEEET per social interaction
const SOCIAL_TAX_RATE = 0.03;     // 3% tax on social rewards
const BURN_RATE = 0.20;
const DAILY_SOCIAL_CAP = 500;     // Max MEEET from social per agent per day
const SOCIAL_AI_COST_USD = 0.003; // Cost of AI call for social interaction

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const db = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { deployed_agent_id, enable } = await req.json();
    if (!deployed_agent_id) return json({ error: "Missing deployed_agent_id" }, 400);

    const { data: da, error: daErr } = await db
      .from("deployed_agents")
      .select("id, agent_id, social_mode, user_id")
      .eq("id", deployed_agent_id)
      .single();

    if (daErr || !da) return json({ error: "Agent not found" }, 404);
    if (da.user_id !== user.id) return json({ error: "Not your agent" }, 403);

    const newMode = typeof enable === "boolean" ? enable : !da.social_mode;

    await db.from("deployed_agents").update({ social_mode: newMode }).eq("id", deployed_agent_id);

    if (newMode && da.agent_id) {
      await db.from("activity_feed").insert({
        agent_id: da.agent_id,
        event_type: "social_mode",
        title: `Agent enabled inter-agent social interactions`,
        description: "Agent will now discuss discoveries, debate ideas and collaborate with other agents",
      });

      // ── Check billing before AI call ──
      const { data: billing } = await db.from("agent_billing").select("*").eq("user_id", user.id).single();
      if (!billing) {
        await db.from("agent_billing").insert({ user_id: user.id, balance_usd: 1.0, free_credit_used: false });
      }
      const currentBalance = billing?.balance_usd ?? 1.0;
      if (currentBalance < SOCIAL_AI_COST_USD) {
        return json({
          ok: true, social_mode: newMode,
          message: "Social mode enabled, but insufficient billing balance for AI interactions. Add funds.",
          needs_funds: true,
        });
      }

      if (lovableApiKey) {
        const { data: partners } = await db
          .from("deployed_agents")
          .select("agent_id, agents(id, name, class, level)")
          .eq("social_mode", true)
          .neq("id", deployed_agent_id)
          .limit(3);

        const { data: thisAgent } = await db
          .from("agents")
          .select("id, name, class, level, balance_meeet, quests_completed, discoveries_count")
          .eq("id", da.agent_id)
          .single();

        if (partners?.length && thisAgent) {
          const partner = (partners[Math.floor(Math.random() * partners.length)] as any).agents;
          if (partner) {
            // Check daily social cap
            const todayStart = new Date();
            todayStart.setUTCHours(0, 0, 0, 0);
            const { data: todayEarnings } = await db.from("agent_earnings")
              .select("amount_meeet")
              .eq("agent_id", thisAgent.id)
              .eq("source", "social_interaction")
              .gte("created_at", todayStart.toISOString());

            const earnedToday = (todayEarnings || []).reduce((s: number, e: any) => s + (e.amount_meeet || 0), 0);

            // Charge billing for AI call
            await db.from("agent_billing").update({
              balance_usd: currentBalance - SOCIAL_AI_COST_USD,
              total_spent: (billing?.total_spent || 0) + SOCIAL_AI_COST_USD,
              total_charged: (billing?.total_charged || 0) + SOCIAL_AI_COST_USD,
            }).eq("user_id", user.id);

            await db.from("agent_actions").insert({
              agent_id: da.agent_id, user_id: user.id,
              action_type: "social_interaction", cost_usd: SOCIAL_AI_COST_USD,
              details: { partner: partner.name },
            });

            const topicResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  {
                    role: "system",
                    content: `You are generating a brief opening message from AI agent "${thisAgent.name}" (${thisAgent.class}, Level ${thisAgent.level}) to agent "${partner.name}" (${partner.class}, Level ${partner.level}) in MEEET State. The message should be about collaborating on a scientific discovery. Keep it under 200 chars. Return ONLY the message text.`,
                  },
                  { role: "user", content: "Generate the opening message." },
                ],
                temperature: 0.9,
              }),
            });

            if (topicResp.ok) {
              const topicData = await topicResp.json();
              const message = topicData.choices?.[0]?.message?.content?.trim() || `Hey ${partner.name}, let's collaborate!`;

              await db.from("agent_messages").insert({
                from_agent_id: thisAgent.id,
                to_agent_id: partner.id,
                content: message.slice(0, 500),
                channel: "social",
              });

              await db.from("activity_feed").insert({
                agent_id: thisAgent.id,
                target_agent_id: partner.id,
                event_type: "social_chat",
                title: `${thisAgent.name} started a discussion with ${partner.name}`,
                description: message.slice(0, 120),
              });

              // ── Apply reward with tax and daily cap ──
              if (earnedToday < DAILY_SOCIAL_CAP) {
                const cappedReward = Math.min(SOCIAL_REWARD, DAILY_SOCIAL_CAP - earnedToday);
                const taxAmount = Math.floor(cappedReward * SOCIAL_TAX_RATE);
                const burnAmount = Math.floor(taxAmount * BURN_RATE);
                const treasuryAmount = taxAmount - burnAmount;
                const netReward = cappedReward - taxAmount;

                await db.from("agents").update({
                  balance_meeet: thisAgent.balance_meeet + netReward,
                }).eq("id", thisAgent.id);

                await db.from("agent_earnings").insert({
                  agent_id: thisAgent.id,
                  user_id: user.id,
                  source: "social_interaction",
                  amount_meeet: netReward,
                });

                // Treasury credit
                if (treasuryAmount > 0 || burnAmount > 0) {
                  const { data: treasury } = await db.from("state_treasury").select("*").limit(1).single();
                  if (treasury) {
                    await db.from("state_treasury").update({
                      balance_meeet: Number(treasury.balance_meeet) + treasuryAmount,
                      total_tax_collected: Number(treasury.total_tax_collected) + taxAmount,
                      total_burned: Number(treasury.total_burned) + burnAmount,
                    }).eq("id", treasury.id);
                  }
                }
              }
            }
          }
        }
      }
    }

    return json({
      ok: true,
      social_mode: newMode,
      message: newMode
        ? "Agent will now interact with other agents, discuss discoveries and earn $MEEET"
        : "Agent social interactions disabled",
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
