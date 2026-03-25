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

const TIERS: Record<string, { price_sol: number; price_meeet: number; max_agents: number; label: string }> = {
  pro: { price_sol: 0.07, price_meeet: 9990, max_agents: 5, label: "Pro" },
  enterprise: { price_sol: 0.21, price_meeet: 29990, max_agents: 50, label: "Enterprise" },
};

// Revenue split for SOL payments
const REVENUE_SPLIT = {
  lp: 0.40,       // 40% to liquidity pool
  ops: 0.30,      // 30% to operations
  treasury: 0.20, // 20% to state treasury
  team: 0.10,     // 10% to team
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Parse body ONCE
    const body = await req.json();
    const { action, user_id, tier, promo_code, tx_signature, agent_id } = body;

    // ── Validate promo code ──
    if (action === "validate_promo") {
      if (!promo_code) return json({ valid: false, error: "No code provided" });

      const { data: promo } = await sc
        .from("promo_codes")
        .select("*")
        .eq("code", promo_code.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (!promo) return json({ valid: false, error: "Invalid or expired promo code" });

      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return json({ valid: false, error: "Promo code has expired" });
      }
      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        return json({ valid: false, error: "Promo code has been fully redeemed" });
      }
      if (user_id) {
        const { data: existing } = await sc
          .from("promo_redemptions")
          .select("id")
          .eq("promo_id", promo.id)
          .eq("user_id", user_id)
          .single();
        if (existing) {
          return json({ valid: false, error: "You have already used this promo code" });
        }
      }

      const tierInfo = TIERS[promo.tier];
      const discountedPrice = tierInfo
        ? tierInfo.price_sol * (1 - promo.discount_pct / 100)
        : 0;

      return json({
        valid: true,
        tier: promo.tier,
        discount_pct: promo.discount_pct,
        duration_days: promo.duration_days,
        original_price_sol: tierInfo?.price_sol ?? 0,
        final_price_sol: discountedPrice,
        label: tierInfo?.label ?? promo.tier,
      });
    }

    // ── Redeem promo code (free upgrade) ──
    if (action === "redeem_promo") {
      if (!user_id || !promo_code) return json({ error: "user_id and promo_code required" }, 400);

      const { data: promo } = await sc
        .from("promo_codes")
        .select("*")
        .eq("code", promo_code.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (!promo) return json({ error: "Invalid promo code" }, 400);
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return json({ error: "Promo code expired" }, 400);
      }
      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        return json({ error: "Promo code fully redeemed" }, 400);
      }

      const { data: existing } = await sc
        .from("promo_redemptions")
        .select("id")
        .eq("promo_id", promo.id)
        .eq("user_id", user_id)
        .single();
      if (existing) return json({ error: "Already redeemed" }, 400);

      if (promo.discount_pct < 100) {
        return json({ error: "This promo code gives a discount, not a free upgrade. Use with payment." }, 400);
      }

      const tierInfo = TIERS[promo.tier];
      if (!tierInfo) return json({ error: "Invalid tier in promo" }, 400);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + promo.duration_days);

      await upsertSubscription(sc, user_id, promo.tier, tierInfo.max_agents, 0, expiresAt);

      await sc.from("promo_redemptions").insert({ promo_id: promo.id, user_id });
      await sc.from("promo_codes").update({ used_count: promo.used_count + 1 }).eq("id", promo.id);

      return json({
        success: true,
        tier: promo.tier,
        max_agents: tierInfo.max_agents,
        expires_at: expiresAt.toISOString(),
        message: `Upgraded to ${tierInfo.label} for ${promo.duration_days} days!`,
      });
    }

    // ── Purchase with SOL ──
    if (action === "purchase") {
      if (!user_id || !tier) return json({ error: "user_id and tier required" }, 400);

      const tierInfo = TIERS[tier];
      if (!tierInfo) return json({ error: "Invalid tier" }, 400);
      if (!tx_signature) return json({ error: "Transaction signature required" }, 400);

      // Check for duplicate tx_signature to prevent replay attacks
      const { data: existingPayment } = await sc.from("payments")
        .select("id")
        .eq("tx_hash", tx_signature)
        .single();
      if (existingPayment) return json({ error: "Transaction already processed" }, 400);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await upsertSubscription(sc, user_id, tier, tierInfo.max_agents, tierInfo.price_sol, expiresAt);

      // Log payment with revenue split
      await sc.from("payments").insert({
        user_id,
        amount_usdc: tierInfo.price_sol,
        payment_method: "solana",
        reference_type: "subscription",
        reference_id: tx_signature,
        status: "completed",
        tx_hash: tx_signature,
      });

      // Credit treasury portion (20% of SOL value converted to MEEET equivalent)
      const treasuryMeeet = Math.floor(tierInfo.price_meeet * REVENUE_SPLIT.treasury);
      const { data: treasury } = await sc.from("state_treasury").select("*").limit(1).single();
      if (treasury) {
        await sc.from("state_treasury").update({
          balance_meeet: Number(treasury.balance_meeet) + treasuryMeeet,
        }).eq("id", treasury.id);
      }

      return json({
        success: true, tier,
        max_agents: tierInfo.max_agents,
        expires_at: expiresAt.toISOString(),
        revenue_split: {
          lp: `${REVENUE_SPLIT.lp * 100}%`,
          ops: `${REVENUE_SPLIT.ops * 100}%`,
          treasury: `${REVENUE_SPLIT.treasury * 100}%`,
          team: `${REVENUE_SPLIT.team * 100}%`,
        },
      });
    }

    // ── Purchase with MEEET (from agent internal balance) ──
    if (action === "purchase_meeet") {
      if (!user_id || !tier) return json({ error: "user_id and tier required" }, 400);

      const tierInfo = TIERS[tier];
      if (!tierInfo) return json({ error: "Invalid tier" }, 400);

      // Get user's first agent (or specified agent)
      const agentQuery = sc.from("agents").select("id, balance_meeet").eq("user_id", user_id);
      if (agent_id) {
        agentQuery.eq("id", agent_id);
      } else {
        agentQuery.order("created_at", { ascending: true }).limit(1);
      }
      const { data: agent } = await agentQuery.single();

      if (!agent) return json({ error: "No agent found. Create an agent first." }, 400);
      if (agent.balance_meeet < tierInfo.price_meeet) {
        return json({
          error: `Insufficient MEEET balance. Need ${tierInfo.price_meeet.toLocaleString()}, have ${agent.balance_meeet.toLocaleString()}.`,
          required: tierInfo.price_meeet,
          current: agent.balance_meeet,
        }, 402);
      }

      // Apply tax on MEEET subscription purchase (5%)
      const taxAmount = Math.floor(tierInfo.price_meeet * 0.05);
      const burnAmount = Math.floor(taxAmount * 0.20);
      const treasuryAmount = taxAmount - burnAmount;
      const totalDeducted = tierInfo.price_meeet; // User pays full price, tax comes from within

      await sc.from("agents").update({
        balance_meeet: agent.balance_meeet - totalDeducted,
      }).eq("id", agent.id);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await upsertSubscription(sc, user_id, tier, tierInfo.max_agents, 0, expiresAt);

      // Record transaction
      await sc.from("transactions").insert({
        type: "passport_purchase",
        from_agent_id: agent.id,
        from_user_id: user_id,
        amount_meeet: tierInfo.price_meeet - taxAmount,
        tax_amount: taxAmount,
        burn_amount: burnAmount,
        description: `${tierInfo.label} subscription purchased for ${tierInfo.price_meeet} $MEEET`,
      });

      // Update treasury
      if (treasuryAmount > 0 || burnAmount > 0) {
        const { data: treasury } = await sc.from("state_treasury").select("*").limit(1).single();
        if (treasury) {
          await sc.from("state_treasury").update({
            balance_meeet: Number(treasury.balance_meeet) + treasuryAmount,
            total_tax_collected: Number(treasury.total_tax_collected) + taxAmount,
            total_burned: Number(treasury.total_burned) + burnAmount,
            total_passport_revenue: Number(treasury.total_passport_revenue || 0) + treasuryAmount,
          }).eq("id", treasury.id);
        }
      }

      return json({
        success: true, tier,
        max_agents: tierInfo.max_agents,
        expires_at: expiresAt.toISOString(),
        meeet_charged: tierInfo.price_meeet,
        tax: taxAmount,
        burned: burnAmount,
      });
    }

    // ── Get pricing ──
    if (action === "get_tiers") {
      return json({
        tiers: Object.entries(TIERS).map(([key, val]) => ({ id: key, ...val })),
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("purchase-subscription error:", err);
    return json({ error: err.message }, 500);
  }
});

async function upsertSubscription(
  sc: any, userId: string, tier: string,
  maxAgents: number, price: number, expiresAt: Date,
) {
  const { data: existingSub } = await sc
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  const payload = {
    tier, plan: tier,
    max_agents: maxAgents,
    price,
    expires_at: expiresAt.toISOString(),
  };

  if (existingSub) {
    await sc.from("subscriptions").update(payload).eq("id", existingSub.id);
  } else {
    await sc.from("subscriptions").insert({ user_id: userId, status: "active", ...payload });
  }
}
