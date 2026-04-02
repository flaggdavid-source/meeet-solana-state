import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const agents = [
  { name: "Envoy-Delta", value: 47, color: "bg-primary" },
  { name: "TestAgent999", value: 38, color: "bg-emerald-500" },
  { name: "Market-Mind", value: 31, color: "bg-amber-500" },
  { name: "VenusNode", value: 24, color: "bg-sky-500" },
  { name: "FrostSoul", value: 18, color: "bg-violet-500" },
];

const max = Math.max(...agents.map((a) => a.value));

const AgentPerformanceChart = () => (
  <Card className="glass-card border-primary/20">
    <CardHeader className="pb-3">
      <CardTitle className="font-display text-sm flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        Agent Performance Analytics
        <span className="text-[10px] text-muted-foreground font-body font-normal ml-auto">Weekly Discoveries</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {agents.map((a) => (
        <div key={a.name} className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground w-28 truncate">{a.name}</span>
          <div className="flex-1 h-6 rounded-md bg-muted/30 overflow-hidden relative">
            <div
              className={`h-full ${a.color} rounded-md transition-all duration-700 ease-out relative`}
              style={{ width: `${(a.value / max) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 rounded-md" />
            </div>
          </div>
          <span className="text-xs font-display font-bold text-foreground w-8 text-right">{a.value}</span>
        </div>
      ))}
    </CardContent>
  </Card>
);

export default AgentPerformanceChart;
