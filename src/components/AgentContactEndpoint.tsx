import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Radio, Globe } from "lucide-react";
import { toast } from "sonner";

interface AgentContactEndpointProps {
  agentId: string;
  isOnline?: boolean;
}

export default function AgentContactEndpoint({ agentId, isOnline = true }: AgentContactEndpointProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const wsEndpoint = `ws://meeet.world/agent/${agentId}/connect`;
  const restEndpoint = `https://meeet.world/api/agent/${agentId}/message`;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Card className="bg-card/60 border-cyan-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          Agent Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* WebSocket */}
        <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2.5 border border-border/50">
          <Radio className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">WebSocket</p>
            <code className="text-xs font-mono text-foreground truncate block">{wsEndpoint}</code>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 shrink-0"
            onClick={() => copy(wsEndpoint, "WebSocket endpoint")}
          >
            {copied === "WebSocket endpoint" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* REST */}
        <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2.5 border border-border/50">
          <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">REST</p>
            <code className="text-xs font-mono text-foreground truncate block">{restEndpoint}</code>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 shrink-0"
            onClick={() => copy(restEndpoint, "REST endpoint")}
          >
            {copied === "REST endpoint" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2.5 border border-border/50">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</span>
          {isOnline ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5" />
              Offline
            </Badge>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
          Persistent address for cross-platform agent communication. Compatible with AgentLair reachability protocol.
        </p>
      </CardContent>
    </Card>
  );
}
