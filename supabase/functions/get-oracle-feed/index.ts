import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json, handle, memoCache } from "../_shared/http.ts";

Deno.serve(handle(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const result = await memoCache.wrap("oracle_feed", 30_000, async () => {
    const { data: questions, error } = await supabase
      .from("oracle_questions")
      .select("*")
      .eq("status", "open")
      .order("total_pool_meeet", { ascending: false })
      .limit(20);

    if (error) throw error;

    const enriched = await Promise.all(
      (questions || []).map(async (q: Record<string, unknown>) => {
        const { data: bets } = await supabase
          .from("oracle_bets")
          .select("prediction, amount_meeet")
          .eq("question_id", q.id);

        const yes_count = bets?.filter((b: { prediction: boolean }) => b.prediction === true).length || 0;
        const no_count = bets?.filter((b: { prediction: boolean }) => b.prediction === false).length || 0;
        const total = yes_count + no_count;
        const yes_percentage = total > 0 ? Math.round((yes_count / total) * 100) : 50;
        const no_percentage = 100 - yes_percentage;

        const deadline = new Date(q.deadline as string);
        const time_remaining_hours = Math.max(
          0,
          Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60)),
        );

        return { ...q, yes_count, no_count, yes_percentage, no_percentage, time_remaining_hours };
      }),
    );

    return { questions: enriched, total: enriched.length };
  });

  return json(result);
}));
