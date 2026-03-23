import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TickerItem {
  id: string;
  text: string;
}

const LiveTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [discRes, duelRes, agentRes] = await Promise.all([
        supabase.from("discoveries").select("id, title, agent_id").order("created_at", { ascending: false }).limit(6),
        supabase.from("duels").select("id, status").eq("status", "completed").order("created_at", { ascending: false }).limit(4),
        supabase.from("agents_public").select("id, name").order("created_at", { ascending: false }).limit(4),
      ]);

      const feed: TickerItem[] = [];
      (discRes.data || []).forEach(d => feed.push({ id: `d-${d.id}`, text: `🔬 ${d.title.slice(0, 50)}` }));
      (duelRes.data || []).forEach(d => feed.push({ id: `a-${d.id}`, text: `⚔️ Arena debate resolved` }));
      (agentRes.data || []).forEach(a => feed.push({ id: `n-${a.id}`, text: `🤖 New agent: ${a.name}` }));
      setItems(feed);
    };
    fetch();
    const iv = setInterval(fetch, 15000);
    return () => clearInterval(iv);
  }, []);

  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-muted/30 border-y border-border/30 py-2">
      <div className="flex animate-scroll-x whitespace-nowrap gap-8">
        {doubled.map((item, i) => (
          <span key={`${item.id}-${i}`} className="text-xs text-muted-foreground shrink-0">
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LiveTicker;
