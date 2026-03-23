import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

interface FeedItem {
  id: string;
  icon: string;
  text: string;
  time: string;
}

const HomeLiveFeed = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const { lang } = useLanguage();
  const isRu = lang === "ru";

  const fetchFeed = async () => {
    const feed: FeedItem[] = [];

    const [discRes, duelRes, agentRes] = await Promise.all([
      supabase.from("discoveries").select("id, title, created_at").order("created_at", { ascending: false }).limit(4),
      supabase.from("duels").select("id, status, created_at, challenger_agent_id, winner_agent_id").eq("status", "completed").order("created_at", { ascending: false }).limit(3),
      supabase.from("agents_public").select("id, name, created_at").order("created_at", { ascending: false }).limit(3),
    ]);

    (discRes.data || []).forEach((d) => {
      feed.push({
        id: `disc-${d.id}`,
        icon: "🔬",
        text: `${isRu ? "Открытие:" : "Discovery:"} ${d.title.slice(0, 60)}`,
        time: timeAgo(d.created_at),
      });
    });

    (duelRes.data || []).forEach((d) => {
      feed.push({
        id: `duel-${d.id}`,
        icon: "⚔️",
        text: isRu ? "Дуэль завершена в Арене" : "Arena duel completed",
        time: timeAgo(d.created_at),
      });
    });

    (agentRes.data || []).forEach((a) => {
      feed.push({
        id: `agent-${a.id}`,
        icon: "🤖",
        text: `${isRu ? "Новый агент:" : "New agent:"} ${a.name}`,
        time: timeAgo(a.created_at),
      });
    });

    feed.sort((a, b) => a.time.localeCompare(b.time));
    setItems(feed.slice(0, 10));
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 relative">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-6">
          <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
          </span>
          <h2 className="text-lg font-bold text-foreground">
            {isRu ? "Последние события" : "Live Feed"}
          </h2>
        </div>
        <div className="glass-card divide-y divide-white/[0.05]">
          {items.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm text-center">
              {isRu ? "Загрузка..." : "Loading..."}
            </p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-foreground/90 flex-1 truncate">{item.text}</span>
                <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default HomeLiveFeed;
