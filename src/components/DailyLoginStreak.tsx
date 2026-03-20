import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Gift, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STREAK_BONUSES = [10, 20, 30, 50, 75, 100, 200];

export default function DailyLoginStreak() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: streakData } = useQuery({
    queryKey: ["daily-streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      const { data: todayLogin } = await supabase
        .from("daily_logins" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("login_date", today)
        .maybeSingle();

      const { data: yesterdayLogin } = await supabase
        .from("daily_logins" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("login_date", yesterday)
        .maybeSingle();

      return {
        todayCheckedIn: !!(todayLogin as any),
        currentStreak: (todayLogin as any)?.streak_count ?? (yesterdayLogin as any)?.streak_count ?? 0,
        yesterdayStreak: (yesterdayLogin as any)?.streak_count ?? 0,
      };
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      const { data: yesterdayLogin } = await supabase
        .from("daily_logins" as any)
        .select("streak_count")
        .eq("user_id", user.id)
        .eq("login_date", yesterday)
        .maybeSingle();

      const prevStreak = (yesterdayLogin as any)?.streak_count ?? 0;
      const newStreak = prevStreak + 1;
      const bonus = STREAK_BONUSES[Math.min(newStreak - 1, STREAK_BONUSES.length - 1)];

      const { error } = await supabase.from("daily_logins" as any).insert({
        user_id: user.id,
        login_date: today,
        streak_count: newStreak,
        bonus_meeet: bonus,
      } as any);

      if (error) {
        if (error.code === "23505") return { alreadyCheckedIn: true, streak: newStreak, bonus: 0 };
        throw error;
      }
      return { alreadyCheckedIn: false, streak: newStreak, bonus };
    },
    onSuccess: (data) => {
      if (data && !data.alreadyCheckedIn) {
        toast({
          title: `🔥 ${data.streak}-дневный стрик!`,
          description: `+${data.bonus} $MEEET бонус за вход`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["daily-streak"] });
    },
  });

  useEffect(() => {
    if (user && streakData && !streakData.todayCheckedIn) {
      checkInMutation.mutate();
    }
  }, [user, streakData?.todayCheckedIn]);

  if (!user || !streakData) return null;

  const streak = streakData.currentStreak;
  const nextBonus = STREAK_BONUSES[Math.min(streak, STREAK_BONUSES.length - 1)];

  return (
    <Card className="glass-card border-border overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-display text-sm font-bold">
                {streak > 0 ? `${streak}-дневный стрик 🔥` : "Начните стрик!"}
              </p>
              <p className="text-[10px] text-muted-foreground font-body">
                {streakData.todayCheckedIn ? "✅ Сегодня отмечено" : "Войдите завтра для продолжения"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-body">Следующий бонус</p>
            <p className="font-display text-sm font-bold text-primary">+{nextBonus} $MEEET</p>
          </div>
        </div>

        {/* Week progress */}
        <div className="flex gap-1 mt-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i < streak % 7
                  ? "bg-gradient-to-r from-orange-500 to-amber-400"
                  : "bg-muted/30"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-muted-foreground">Пн</span>
          <span className="text-[9px] text-muted-foreground">Вс</span>
        </div>
      </CardContent>
    </Card>
  );
}
