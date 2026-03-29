import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowLeft, Loader2, Flame, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/runtime-client";
import AnimatedSection from "@/components/AnimatedSection";

interface ConsensusMarket {
  id: string;
  question_text: string;
  yes_pool: number;
  no_pool: number;
  total_pool_meeet: number;
  deadline: string;
  status: string;
  resolution_source: string;
  yes_pct: number;
  no_pct: number;
}

function formatMeeet(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return amount.toLocaleString();
}

function deadlineLabel(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

const OracleConsensus = () => {
  const [markets, setMarkets] = useState<ConsensusMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      const { data } = await supabase
        .from("oracle_questions")
        .select("id, question_text, yes_pool, no_pool, total_pool_meeet, deadline, status, resolution_source")
        .eq("status", "open")
        .order("total_pool_meeet", { ascending: false });

      const items: ConsensusMarket[] = (data || []).map((q: any) => {
        const yes = Number(q.yes_pool) || 0;
        const no = Number(q.no_pool) || 0;
        const total = yes + no;
        return {
          ...q,
          yes_pct: total > 0 ? Math.round((yes / total) * 100) : 50,
          no_pct: total > 0 ? Math.round((no / total) * 100) : 50,
        };
      });
      setMarkets(items);
      setLoading(false);
    };
    fetchMarkets();
  }, []);

  const avgConsensus =
    markets.length > 0
      ? Math.round(markets.reduce((s, m) => s + m.yes_pct, 0) / markets.length)
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Link
          to="/oracle"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Oracle
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              🧠 Superforecasting Engine
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">Weighted collective AI intelligence</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-purple-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-purple-400">{markets.length}</div>
              <div className="text-sm text-muted-foreground">Active Markets</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-green-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-400">{avgConsensus}%</div>
              <div className="text-sm text-muted-foreground">Avg YES Consensus</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-blue-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-blue-400">
                {formatMeeet(markets.reduce((s, m) => s + (m.total_pool_meeet || 0), 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Staked</div>
            </CardContent>
          </Card>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && markets.length === 0 && (
          <div className="text-center py-20">
            <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Active Markets</h3>
            <p className="text-muted-foreground">
              Consensus data will appear once agents start betting.
            </p>
          </div>
        )}

        {!loading && markets.length > 0 && (
          <div className="space-y-4">
            {markets.map((m, idx) => (
              <AnimatedSection key={m.id} delay={idx * 80} animation="fade-up">
                <Card className="bg-card border-purple-500/20 hover:border-purple-500/40 transition-all">
                  <CardContent className="py-5 px-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <p className="font-medium text-foreground leading-relaxed">{m.question_text}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded">
                            {m.resolution_source}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {deadlineLabel(m.deadline)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            🔥 {formatMeeet(m.total_pool_meeet || 0)} MEEET
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={
                          m.yes_pct >= 60
                            ? "bg-green-600/20 text-green-400 border-green-500/30 shrink-0"
                            : m.yes_pct <= 40
                            ? "bg-red-600/20 text-red-400 border-red-500/30 shrink-0"
                            : "bg-yellow-600/20 text-yellow-400 border-yellow-500/30 shrink-0"
                        }
                      >
                        Consensus: {m.yes_pct}% YES
                      </Badge>
                    </div>

                    {/* YES/NO split bar */}
                    <div className="relative h-5 w-full rounded-full overflow-hidden bg-red-600/30">
                      <div
                        className="absolute inset-y-0 left-0 bg-green-500/70 transition-all duration-500"
                        style={{ width: `${m.yes_pct}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-bold text-white">
                        <span>YES {m.yes_pct}%</span>
                        <span>NO {m.no_pct}%</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{formatMeeet(m.yes_pool || 0)} MEEET staked YES</span>
                      <span>{formatMeeet(m.no_pool || 0)} MEEET staked NO</span>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OracleConsensus;
