import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, Check, Sparkles, Percent, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROMO_ICONS: Record<string, React.ReactNode> = {
  bonus: <Gift className="w-4 h-4 text-amber-400" />,
  discount: <Percent className="w-4 h-4 text-emerald-400" />,
  referral: <Users className="w-4 h-4 text-blue-400" />,
};

export default function PromoWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: promos = [] } = useQuery({
    queryKey: ["active-promos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_campaigns" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["my-promo-claims", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_claims" as any)
        .select("promo_id")
        .eq("user_id", user!.id);
      return (data ?? []).map((c: any) => c.promo_id);
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (promoId: string) => {
      if (!user) throw new Error("Not authenticated");
      const promo = promos.find((p: any) => p.id === promoId);
      if (!promo) throw new Error("Promo not found");

      const { error } = await supabase.from("promo_claims" as any).insert({
        user_id: user.id,
        promo_id: promoId,
        bonus_received: promo.bonus_meeet || 0,
      } as any);
      if (error) {
        if (error.code === "23505") throw new Error("Уже получено");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-promo-claims"] });
      queryClient.invalidateQueries({ queryKey: ["active-promos"] });
      toast({ title: "🎉 Промо активировано!" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  if (!user || promos.length === 0) return null;

  const unclaimed = promos.filter((p: any) => !claims.includes(p.id));
  if (unclaimed.length === 0) return null;

  return (
    <div className="space-y-2">
      {unclaimed.map((promo: any) => (
        <Card key={promo.id} className="glass-card border-primary/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                {PROMO_ICONS[promo.promo_type] || <Sparkles className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold truncate">{promo.name}</p>
                  {promo.bonus_meeet > 0 && (
                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 shrink-0">
                      +{promo.bonus_meeet} $MEEET
                    </Badge>
                  )}
                  {promo.discount_pct > 0 && (
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                      -{promo.discount_pct}%
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-body mt-0.5">{promo.description}</p>
                {promo.max_claims && (
                  <p className="text-[9px] text-muted-foreground/60 font-body mt-1">
                    Осталось: {promo.max_claims - (promo.current_claims || 0)} из {promo.max_claims}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-xs h-8 gap-1"
                disabled={claimMutation.isPending}
                onClick={() => claimMutation.mutate(promo.id)}
              >
                {claimMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Gift className="w-3 h-3" />
                )}
                Забрать
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
