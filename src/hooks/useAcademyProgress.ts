import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";

export interface AcademyProgressSummary {
  totalModules: number;
  completed: number;
  inProgress: number;
  pct: number;
  graduated: boolean;
}

export const useAcademyProgress = () => {
  const { user } = useAuth();

  return useQuery<AcademyProgressSummary>({
    queryKey: ["academy-progress-summary", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const [modulesRes, progressRes, certRes] = await Promise.all([
        supabase.from("academy_modules").select("id", { count: "exact", head: true }),
        supabase.from("academy_progress").select("status").eq("user_id", user!.id),
        supabase.from("academy_certificates").select("id").eq("user_id", user!.id).maybeSingle(),
      ]);

      const totalModules = modulesRes.count ?? 0;
      const rows = progressRes.data ?? [];
      const completed = rows.filter((r: any) => r.status === "completed").length;
      const inProgress = rows.filter((r: any) => r.status === "in_progress").length;
      const pct = totalModules > 0 ? Math.round((completed / totalModules) * 100) : 0;

      return {
        totalModules,
        completed,
        inProgress,
        pct,
        graduated: !!certRes.data,
      };
    },
  });
};
