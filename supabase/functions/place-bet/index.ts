import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse & validate body
    const body = await req.json();
    const { question_id, prediction, amount_meeet } = body;

    if (!question_id || prediction === undefined || prediction === null) {
      return json({ error: "Missing required fields: question_id, prediction, amount_meeet" }, 400);
    }

    const amount = Number(amount_meeet) || 0;
    if (amount < 50) {
      return json({ error: "Minimum bet is 50 MEEET" }, 400);
    }

    // Validate question exists, is open, and deadline not passed
    const { data: question } = await supabase
      .from("oracle_questions")
      .select("id, status, deadline, total_pool_meeet, yes_pool, no_pool")
      .eq("id", question_id)
      .maybeSingle();

    if (!question || question.status !== "open" || new Date(question.deadline) < new Date()) {
      return json({ error: "Market is closed or not found" }, 400);
    }

    // Try to get bettor_id from optional auth header
    let bettorId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabase.auth.getClaims(token);
      if (claimsData?.claims?.sub) {
        bettorId = claimsData.claims.sub as string;
      }
    }

    // Insert bet (anonymous ok - bettor_id can be null)
    const { data: bet, error: betError } = await supabase
      .from("oracle_bets")
      .insert({
        question_id,
        bettor_type: "user",
        bettor_id: bettorId,
        prediction: !!prediction,
        amount_meeet: amount,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (betError) {
      console.error("place-bet insert error:", betError);
      return json({ error: betError.message }, 500);
    }

    // Update oracle_questions pools
    const currentYes = Number(question.yes_pool) || 0;
    const currentNo = Number(question.no_pool) || 0;
    const currentTotal = Number(question.total_pool_meeet) || 0;

    const newYesPool = !!prediction ? currentYes + amount : currentYes;
    const newNoPool = !!prediction ? currentNo : currentNo + amount;
    const newTotalPool = currentTotal + amount;

    const { error: updateError } = await supabase
      .from("oracle_questions")
      .update({
        yes_pool: newYesPool,
        no_pool: newNoPool,
        total_pool_meeet: newTotalPool,
      })
      .eq("id", question_id);

    if (updateError) {
      console.error("place-bet pool update error:", updateError);
    }

    const yesPercentage = newTotalPool > 0
      ? Math.round((newYesPool / newTotalPool) * 100)
      : 50;

    return json({
      success: true,
      bet_id: bet.id,
      new_yes_pool: newYesPool,
      new_no_pool: newNoPool,
      yes_percentage: yesPercentage,
    });
  } catch (err) {
    console.error("place-bet error:", err);
    return json({ error: String(err) }, 500);
  }
});
