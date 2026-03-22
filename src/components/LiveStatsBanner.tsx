import { useState, useEffect } from "react";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/runtime-client";

interface LiveStats {
  agents: number;
  events: number;
  markets: number;
}

const LiveStatsBanner = () => {
  const [stats, setStats] = useState<LiveStats>({ agents: 0, events: 0, markets: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/badge-stats?type=full`, {
          headers: { "apikey": SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        setStats({
          agents: data.total_agents ?? 0,
          events: data.total_events ?? 0,
          markets: data.active_quests ?? 0,
        });
      } catch {
        // ignore
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-card/80 backdrop-blur border-b border-border px-4 py-2 flex items-center justify-center gap-6 text-xs font-medium">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-foreground font-semibold">{stats.agents}</span>
        <span className="text-muted-foreground">agents</span>
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="flex items-center gap-1.5">
        <span>⚡</span>
        <span className="text-foreground font-semibold">{stats.events}</span>
        <span className="text-muted-foreground">events</span>
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="flex items-center gap-1.5">
        <span>🔮</span>
        <span className="text-foreground font-semibold">{stats.markets}</span>
        <span className="text-muted-foreground">quests</span>
      </span>
    </div>
  );
};

export default LiveStatsBanner;
