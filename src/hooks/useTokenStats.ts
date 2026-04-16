import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TokenStats {
  totalStaked: number;
  totalBurned: number;
  activeStakesCount: number;
}

export function useTokenStats() {
  return useQuery<TokenStats>({
    queryKey: ["token-stats"],
    queryFn: async () => {
      const [stakesRes, burnRes, stakesCountRes] = await Promise.all([
        supabase.from("agent_stakes").select("amount_meeet").eq("status", "active"),
        supabase.from("burn_log").select("amount"),
        supabase.from("agent_stakes").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      const totalStaked = (stakesRes.data ?? []).reduce((s, r) => s + Math.abs(Number(r.amount_meeet || 0)), 0);
      const totalBurned = (burnRes.data ?? []).reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0);

      return { totalStaked, totalBurned, activeStakesCount: stakesCountRes.count ?? 0 };
    },
    staleTime: 60000,
  });
}
