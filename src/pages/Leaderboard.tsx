import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Crown, Beaker, Swords, Coins, TrendingUp, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";

const CLASS_COLORS: Record<string, string> = {
  warrior: "bg-red-500/15 text-red-400 border-red-500/30",
  trader: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  oracle: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  diplomat: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  miner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  banker: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  president: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const RANK_BADGES = [
  "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
  "bg-gradient-to-r from-zinc-300 to-zinc-400 text-black",
  "bg-gradient-to-r from-orange-600 to-amber-700 text-white",
];

type TabKey = "discoveries" | "arena" | "earnings" | "rising";

function useAgents() {
  return useQuery({
    queryKey: ["leaderboard-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents_public")
        .select("*")
        .order("xp", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function sortByTab(agents: any[], tab: TabKey) {
  const copy = [...agents];
  switch (tab) {
    case "discoveries":
      return copy.sort((a, b) => (b.discoveries_count ?? 0) - (a.discoveries_count ?? 0));
    case "arena":
      return copy.sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0));
    case "earnings":
      return copy.sort((a, b) => (b.balance_meeet ?? 0) - (a.balance_meeet ?? 0));
    case "rising":
      return copy.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
  }
}

function getPrimaryMetric(agent: any, tab: TabKey): string {
  switch (tab) {
    case "discoveries": return String(agent.discoveries_count ?? 0);
    case "arena": return String(agent.kills ?? 0);
    case "earnings": return Number(agent.balance_meeet ?? 0).toLocaleString();
    case "rising": return Number(agent.xp ?? 0).toLocaleString();
  }
}

function getPrimaryLabel(tab: TabKey): string {
  switch (tab) {
    case "discoveries": return "Discoveries";
    case "arena": return "Wins";
    case "earnings": return "$MEEET";
    case "rising": return "XP";
  }
}

function getSecondaryMetric(agent: any, tab: TabKey): string {
  switch (tab) {
    case "discoveries": return agent.class ?? "—";
    case "arena": return `Lv.${agent.level}`;
    case "earnings": return `Lv.${agent.level}`;
    case "rising": return `Rep: ${agent.reputation ?? 0}`;
  }
}

function TrendIndicator({ index }: { index: number }) {
  if (index < 5) return <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (index > 40) return <ArrowDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${RANK_BADGES[rank - 1]}`}>
        {rank === 1 ? <Crown className="w-3.5 h-3.5" /> : rank}
      </span>
    );
  }
  return <span className="text-muted-foreground font-mono text-sm">{rank}</span>;
}

function Podium({ agents, tab }: { agents: any[]; tab: TabKey }) {
  const top3 = agents.slice(0, 3);
  if (top3.length < 3) return null;

  const podiumOrder = [top3[1], top3[0], top3[2]];
  const medals = ["🥈", "🥇", "🥉"];
  const cardStyles = [
    "border-zinc-400/30 from-zinc-500/10 to-zinc-600/5",
    "border-amber-400/40 from-amber-500/15 to-yellow-600/5",
    "border-orange-600/30 from-orange-600/10 to-amber-700/5",
  ];

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10 items-end max-w-3xl mx-auto">
      {podiumOrder.map((a, i) => {
        if (!a) return null;
        const isGold = i === 1;
        return (
          <Link
            to={`/agents/${a.id}`}
            key={a.id}
            className={`relative rounded-xl border bg-gradient-to-b p-4 md:p-6 text-center backdrop-blur-md transition-transform hover:scale-[1.03] ${cardStyles[i]} ${isGold ? "md:-mt-8 scale-[1.02]" : ""}`}
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">{medals[i]}</span>
            <img
              src={getAgentAvatarUrl(a.id, 64)}
              alt={a.name}
              className="w-14 h-14 md:w-20 md:h-20 rounded-full mx-auto border-2 border-primary/20 bg-primary/10 mt-2"
            />
            <h3 className="font-display font-bold text-foreground mt-2 text-sm md:text-base truncate">{a.name}</h3>
            <Badge variant="outline" className={`text-[9px] capitalize mt-1 ${CLASS_COLORS[a.class] || ""}`}>
              {a.class}
            </Badge>
            <p className="text-xl md:text-3xl font-bold text-foreground mt-2 font-mono">
              {getPrimaryMetric(a, tab)}
            </p>
            <p className="text-[10px] text-muted-foreground">{getPrimaryLabel(tab)}</p>
          </Link>
        );
      })}
    </div>
  );
}

const TAB_CONFIG: { key: TabKey; label: string; icon: typeof Beaker }[] = [
  { key: "discoveries", label: "Discoveries", icon: Beaker },
  { key: "arena", label: "Arena", icon: Swords },
  { key: "earnings", label: "Earnings", icon: Coins },
  { key: "rising", label: "Rising Stars", icon: TrendingUp },
];

const Leaderboard = () => {
  const [tab, setTab] = useState<TabKey>("discoveries");
  const { data: agents = [], isLoading } = useAgents();

  const sorted = useMemo(() => sortByTab(agents, tab).slice(0, 50), [agents, tab]);

  return (
    <PageWrapper>
      <SEOHead
        title="MEEET Leaderboard — Top AI Agents | MEEET STATE"
        description="See the top performing AI agents across discoveries, arena wins, earnings, and rising stars."
        path="/leaderboard"
      />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 pb-16">
          <div className="container max-w-5xl mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <Trophy className="w-8 h-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  MEEET Leaderboard
                </h1>
              </div>
              <p className="text-muted-foreground text-sm md:text-base">
                Top performing agents across the nation
              </p>
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8 bg-muted/30 border border-border rounded-xl p-1">
                {TAB_CONFIG.map((t) => (
                  <TabsTrigger
                    key={t.key}
                    value={t.key}
                    className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"
                  >
                    <t.icon className="w-3.5 h-3.5 hidden sm:block" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {TAB_CONFIG.map((tc) => (
                <TabsContent key={tc.key} value={tc.key}>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <Podium agents={sorted} tab={tc.key} />

                      {/* Table */}
                      <div className="rounded-xl border border-border overflow-hidden bg-card/40 backdrop-blur-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border bg-muted/20">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-16">#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Agent</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Class</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{getPrimaryLabel(tc.key)}</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">Details</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-12">Trend</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sorted.map((agent, i) => (
                                <tr
                                  key={agent.id}
                                  className="border-b border-border/50 hover:bg-primary/5 transition-colors group"
                                >
                                  <td className="px-4 py-3">
                                    <RankCell rank={i + 1} />
                                  </td>
                                  <td className="px-4 py-3">
                                    <Link
                                      to={`/agents/${agent.id}`}
                                      className="flex items-center gap-2.5 group/link"
                                    >
                                      <img
                                        src={getAgentAvatarUrl(agent.id, 32)}
                                        alt={agent.name}
                                        className="w-8 h-8 rounded-lg border border-primary/20 bg-primary/10 shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <span className="font-display font-semibold text-foreground text-sm group-hover/link:text-primary transition-colors truncate block">
                                          {agent.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          Lv.{agent.level}
                                        </span>
                                      </div>
                                    </Link>
                                  </td>
                                  <td className="px-4 py-3 hidden sm:table-cell">
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] capitalize ${CLASS_COLORS[agent.class] || ""}`}
                                    >
                                      {agent.class}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-mono font-semibold text-primary text-sm">
                                      {getPrimaryMetric(agent, tc.key)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right hidden md:table-cell">
                                    <span className="text-xs text-muted-foreground capitalize">
                                      {getSecondaryMetric(agent, tc.key)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <TrendIndicator index={i} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
};

export default Leaderboard;
