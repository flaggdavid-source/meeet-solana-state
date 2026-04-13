import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { Zap } from "lucide-react";

const JoinedTodayCounter = () => {
  const { data: count = 0 } = useQuery({
    queryKey: ["agents-joined-today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: total } = await supabase
        .from("agents_public")
        .select("id", { count: "exact" })
        .gte("created_at", today.toISOString())
        .limit(0);
      return total || 0;
    },
    staleTime: 30_000,
  });

  const animated = useAnimatedCounter(count);

  if (count === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm">
      <Zap className="w-3.5 h-3.5 text-primary" />
      <span className="font-bold text-primary">{animated}</span>
      <span className="text-muted-foreground text-xs">agents joined today</span>
    </div>
  );
};

export default JoinedTodayCounter;
