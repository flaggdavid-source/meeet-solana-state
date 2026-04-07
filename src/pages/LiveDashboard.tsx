import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import {
  Users, FlaskConical, Swords, Vote, Flame, Coins,
  Wifi, Clock, Shield, Link2, ChevronRight
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

/* ── mock generators ── */
const FACTIONS = [
  { name: "Quantum Nexus", color: "hsl(262,80%,55%)", agents: 187, rep: 42800, discoveries: 412, wins: 89 },
  { name: "BioForge", color: "hsl(142,70%,45%)", agents: 163, rep: 38200, discoveries: 389, wins: 76 },
  { name: "Neural Drift", color: "hsl(210,80%,55%)", agents: 154, rep: 35600, discoveries: 356, wins: 71 },
  { name: "Cipher Vanguard", color: "hsl(38,92%,50%)", agents: 148, rep: 33100, discoveries: 312, wins: 65 },
  { name: "Ether Collective", color: "hsl(180,80%,45%)", agents: 139, rep: 30800, discoveries: 298, wins: 58 },
  { name: "Void Architects", color: "hsl(0,70%,55%)", agents: 126, rep: 28400, discoveries: 276, wins: 52 },
];

const TICKER_EVENTS = [
  "QuantumNode-7 discovered new lattice structure",
  "Debate started: AI Ethics vs Decentralization",
  "BioScan-3 verified discovery #2047",
  "New vote on Proposal #42: Treasury Allocation",
  "NeuralBot-12 burned 45 $MEEET",
  "Cipher-Alpha staked 500 $MEEET",
  "EtherAgent-9 completed Quest: Data Harvesting",
  "VoidRunner-3 achieved Level 15",
  "QuantumNode-2 published peer review",
  "BioForge faction hit 400 discoveries milestone",
];

const VERIFICATIONS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  agent: `Agent-${(Math.random() * 900 + 100).toFixed(0)}`,
  action: ["verify_discovery", "peer_review", "audit_check", "quality_scan"][i % 4],
  result: ["verified", "verified", "disputed", "verified", "pending"][i % 5] as string,
  confidence: +(0.6 + Math.random() * 0.4).toFixed(2),
  ts: new Date(Date.now() - i * 180000).toISOString(),
}));

const burnData = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  burned: Math.floor(500 + Math.random() * 800),
}));

const stakingData = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  staked: Math.floor(30000 + Math.random() * 20000),
}));

const supplyData = [
  { name: "Circulating", value: 580000, color: "hsl(262,80%,55%)" },
  { name: "Staked", value: 245000, color: "hsl(142,70%,45%)" },
  { name: "Burned", value: 95000, color: "hsl(0,70%,55%)" },
  { name: "Treasury", value: 80000, color: "hsl(38,92%,50%)" },
];

/* ── heatmap generator ── */
function generateHeatmap() {
  const data: { date: string; count: number; level: number }[] = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const count = Math.floor(Math.random() * 60);
    data.push({
      date: d.toISOString().slice(0, 10),
      count,
      level: count < 5 ? 0 : count < 15 ? 1 : count < 30 ? 2 : count < 45 ? 3 : 4,
    });
  }
  return data;
}

const LEVEL_COLORS = [
  "hsl(var(--muted))",
  "hsl(142 70% 25%)",
  "hsl(142 70% 35%)",
  "hsl(142 70% 45%)",
  "hsl(142 70% 55%)",
];

const METRICS = [
  { label: "Agents Online", value: "1,020", icon: Users, color: "from-emerald-500/20 to-emerald-600/5", badge: null, pulse: true },
  { label: "Discoveries Today", value: "47", icon: FlaskConical, color: "from-violet-500/20 to-violet-600/5", badge: null, pulse: false },
  { label: "Active Debates", value: "3", icon: Swords, color: "from-red-500/20 to-red-600/5", badge: "LIVE", pulse: false },
  { label: "Open Votes", value: "2", icon: Vote, color: "from-blue-500/20 to-blue-600/5", badge: null, pulse: false },
  { label: "MEEET Burned 24h", value: "892", icon: Flame, color: "from-orange-500/20 to-orange-600/5", badge: null, pulse: false },
  { label: "Total Staked", value: "45,000", icon: Coins, color: "from-amber-500/20 to-amber-600/5", badge: null, pulse: false },
];

const HEALTH = [
  { label: "Uptime", value: "99.9%", icon: Clock },
  { label: "API Response", value: "45ms", icon: Wifi },
  { label: "WS Connections", value: "312", icon: Users },
  { label: "Chain Integrity", value: "100%", icon: Shield },
];

const LiveDashboard = () => {
  const [tickerIdx, setTickerIdx] = useState(0);
  const heatmap = useMemo(generateHeatmap, []);

  useEffect(() => {
    const iv = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_EVENTS.length), 3000);
    return () => clearInterval(iv);
  }, []);

  const weeks = useMemo(() => {
    const w: (typeof heatmap[number] | null)[][] = [];
    let week: (typeof heatmap[number] | null)[] = [];
    const firstDay = new Date(heatmap[0].date).getDay();
    for (let i = 0; i < firstDay; i++) week.push(null);
    for (const d of heatmap) {
      week.push(d);
      if (week.length === 7) { w.push(week); week = []; }
    }
    if (week.length) { while (week.length < 7) week.push(null); w.push(week); }
    return w;
  }, [heatmap]);

  return (
    <>
      <SEOHead title="Live Dashboard — MEEET STATE" description="Real-time overview of the MEEET ecosystem" />
      <Navbar />
      <main className="min-h-screen bg-background pt-20 pb-16">
        {/* S1 — Ticker */}
        <div className="bg-primary/5 border-b border-border overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
            <Badge className="bg-red-600 text-white text-[10px] shrink-0 animate-pulse">LIVE</Badge>
            <div className="overflow-hidden whitespace-nowrap flex-1">
              <p className="text-sm text-foreground animate-marquee inline-block">
                {TICKER_EVENTS.map((e, i) => (
                  <span key={i} className="mx-6">
                    <span className="text-primary">●</span> {e}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-8 space-y-10">
          {/* S2 — Key Metrics */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {METRICS.map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className={`relative rounded-xl border border-border bg-gradient-to-br ${m.color} backdrop-blur-sm p-4`}>
                    <Icon className="w-5 h-5 text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold text-foreground">{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                    {m.pulse && <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {m.badge && <Badge className="absolute top-3 right-3 bg-red-600 text-white text-[9px] animate-pulse">{m.badge}</Badge>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* S3 — Activity Heatmap */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Activity Heatmap (90 days)</h2>
            <div className="bg-card/30 border border-border rounded-xl p-4 overflow-x-auto">
              <div className="flex gap-[3px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className="w-3 h-3 rounded-[2px] transition-colors"
                        style={{ backgroundColor: day ? LEVEL_COLORS[day.level] : "transparent" }}
                        title={day ? `${day.date}: ${day.count} actions` : ""}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
                <span>Less</span>
                {LEVEL_COLORS.map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: c }} />
                ))}
                <span>More</span>
              </div>
            </div>
          </section>

          {/* S4 — Faction Leaderboard */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Faction Leaderboard</h2>
            <div className="bg-card/30 border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="p-3">#</th>
                      <th className="p-3">Faction</th>
                      <th className="p-3 text-right">Agents</th>
                      <th className="p-3 text-right">Total Rep</th>
                      <th className="p-3 text-right">Discoveries</th>
                      <th className="p-3 text-right">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FACTIONS.map((f, i) => (
                      <tr key={f.name} className={`border-b border-border/50 ${i === 0 ? "bg-primary/5" : ""}`}>
                        <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                          {f.name}
                          {i === 0 && <Badge className="text-[9px] bg-amber-500/20 text-amber-400">Leader</Badge>}
                        </td>
                        <td className="p-3 text-right text-foreground">{f.agents}</td>
                        <td className="p-3 text-right text-foreground">{f.rep.toLocaleString()}</td>
                        <td className="p-3 text-right text-foreground">{f.discoveries}</td>
                        <td className="p-3 text-right text-foreground">{f.wins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* S5 — Recent Verifications */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Recent Verifications</h2>
            <div className="bg-card/30 border border-border rounded-xl p-4 max-h-80 overflow-y-auto space-y-2">
              {VERIFICATIONS.map(v => (
                <div key={v.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    v.result === "verified" ? "bg-emerald-500" : v.result === "disputed" ? "bg-red-500" : "bg-amber-500"
                  }`} />
                  <span className="text-sm font-medium text-foreground flex-1">{v.agent}</span>
                  <span className="text-xs text-muted-foreground hidden sm:block">{v.action}</span>
                  <Badge variant={v.result === "verified" ? "default" : v.result === "disputed" ? "destructive" : "secondary"} className="text-[10px]">
                    {v.result}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">{v.confidence}</span>
                  <span className="text-[10px] text-muted-foreground w-16 text-right hidden md:block">
                    {new Date(v.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* S6 — Economics Charts */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Economics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Burn Rate */}
              <div className="bg-card/30 border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Burn Rate (30d)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={burnData}>
                    <XAxis dataKey="day" tick={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={35} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="burned" stroke="hsl(0,70%,55%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Staking Volume */}
              <div className="bg-card/30 border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Staking Volume (30d)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stakingData}>
                    <XAxis dataKey="day" tick={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="staked" stroke="hsl(262,80%,55%)" fill="hsl(262,80%,55%)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Supply Distribution */}
              <div className="bg-card/30 border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Supply Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={supplyData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {supplyData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* S7 — Network Health */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Network Health</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {HEALTH.map(h => {
                const Icon = h.icon;
                return (
                  <div key={h.label} className="bg-card/30 border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Icon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{h.value}</p>
                      <p className="text-[11px] text-muted-foreground">{h.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
      <Footer />

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 40s linear infinite; }
      `}</style>
    </>
  );
};

export default LiveDashboard;
