import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useState } from "react";

const CLASS_EMOJI: Record<string, string> = {
  warrior: "⚔️", trader: "💰", oracle: "🔮",
  diplomat: "🤝", miner: "⛏️", banker: "🏦", president: "👑",
};

export default function MyDeployedAgents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: deployedAgents = [], isLoading } = useQuery({
    queryKey: ["my-deployed-agents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deployed_agents")
        .select("*, agents(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleAgent = async (deployedId: string, currentStatus: string) => {
    setTogglingId(deployedId);
    try {
      const newStatus = currentStatus === "running" ? "paused" : "running";
      const fnName = currentStatus === "running" ? "pause-agent" : "pause-agent";
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { deployed_agent_id: deployedId, action: newStatus === "running" ? "resume" : "pause" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Optimistic update
      queryClient.invalidateQueries({ queryKey: ["my-deployed-agents"] });
      toast({ title: newStatus === "running" ? "Agent resumed ▶️" : "Agent paused ⏸️" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (deployedAgents.length === 0) return null;

  return (
    <Card className="glass-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            My Deployed Agents
          </CardTitle>
          <Link to="/dashboard/agents" className="text-[10px] text-primary hover:underline">
            View details →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {deployedAgents.map((da: any) => {
          const agent = da.agents;
          const statusColor = da.status === "running" ? "bg-emerald-500" : da.status === "paused" ? "bg-amber-500" : "bg-muted-foreground";
          return (
            <div key={da.id} className="flex items-center gap-3 glass-card rounded-lg px-3 py-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-lg">
                {CLASS_EMOJI[agent?.class] || "🤖"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-display font-bold truncate">{agent?.name || "Agent"}</p>
                  <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[9px] capitalize">{agent?.class}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {Number(da.total_earned_meeet ?? 0).toLocaleString()} MEEET earned
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                disabled={togglingId === da.id}
                onClick={() => toggleAgent(da.id, da.status)}
              >
                {togglingId === da.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : da.status === "running" ? (
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
