import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Rocket, ChevronRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function MySubscriptionCard({ userId }: { userId: string }) {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["my-subscription", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_subscriptions")
        .select("*, agent_plans(*)")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="glass-card border-border overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-secondary to-primary/50" />
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground">Deploy your first agent</p>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Subscribe to a plan and let your AI agent earn $MEEET autonomously.
            </p>
          </div>
          <Link to="/deploy">
            <Button variant="hero" size="sm" className="gap-1.5">
              <Rocket className="w-3.5 h-3.5" /> Get Started <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const plan = subscription.agent_plans as any;
  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
  const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <Card className="glass-card border-border overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            My Subscription
          </CardTitle>
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between glass-card rounded-lg px-4 py-3">
          <div>
            <p className="font-display font-bold text-foreground">{plan?.name || "Unknown Plan"}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {plan?.quests_per_day && (
                <span className="text-[10px] text-muted-foreground font-body">
                  {plan.quests_per_day} quests/day
                </span>
              )}
              {plan?.max_agents && (
                <span className="text-[10px] text-muted-foreground font-body">
                  · {plan.max_agents} agent{plan.max_agents > 1 ? "s" : ""}
                </span>
              )}
              {plan?.compute_tier && (
                <span className="text-[10px] text-muted-foreground font-body capitalize">
                  · {plan.compute_tier} compute
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            {plan?.price_usdc > 0 && (
              <p className="text-sm font-display font-bold text-primary">${plan.price_usdc}<span className="text-[9px] font-normal text-muted-foreground">/mo</span></p>
            )}
            {expiresAt && (
              <div className="flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className={`text-[10px] font-body ${isExpiringSoon ? "text-amber-400" : "text-muted-foreground"}`}>
                  {format(expiresAt, "MMM d, yyyy")}
                </span>
              </div>
            )}
            {isExpiringSoon && (
              <span className="text-[9px] text-amber-400 font-body">Expiring soon</span>
            )}
          </div>
        </div>

        {/* Plan Features */}
        {plan?.features && typeof plan.features === "object" && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(plan.features as Record<string, boolean>)
              .filter(([, v]) => v)
              .map(([k]) => (
                <Badge key={k} variant="outline" className="text-[9px] border-primary/20 text-muted-foreground capitalize">
                  {k.replace(/_/g, " ")}
                </Badge>
              ))}
          </div>
        )}

        <div className="flex gap-2">
          <Link to="/deploy" className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
              Manage Plan
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
