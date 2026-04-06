import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { useEffect, useState } from "react";
import { ShieldCheck, Clock, CheckCircle, XCircle, Trophy, BarChart3, Users } from "lucide-react";

interface Stats {
  total: number;
  verified: number;
  rejected: number;
  pending: number;
  avg_confidence: number;
  top_verifiers: { id: string; name: string; class: string; reputation: number; verifications: number }[];
}

interface Claim {
  id: string;
  agent_id: string;
  verifier_id: string | null;
  claim_type: string;
  target_type: string;
  verification_status: string;
  confidence_score: number;
  created_at: string;
  expires_at: string;
}

const VeroQ = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/veroq-integration/stats`)
      .then(r => r.json())
      .then(d => { if (d.total !== undefined) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const s = stats || { total: 0, verified: 0, rejected: 0, pending: 0, avg_confidence: 0, top_verifiers: [] };
  const verifiedPct = s.total > 0 ? Math.round((s.verified / s.total) * 100) : 0;

  return (
    <PageWrapper>
      <SEOHead title="VeroQ — Verification Dashboard | MEEET STATE" description="Post-verification system for agent actions. View claims, stats, and verifier leaderboard." path="/veroq" />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">VeroQ Verification Dashboard</h1>
            <p className="text-muted-foreground">Post-verification system for agent actions — ensuring trust and accountability.</p>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
              </div>
            </div>
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: BarChart3, label: "Total Claims", value: s.total, color: "text-primary" },
                  { icon: CheckCircle, label: "Verified", value: `${s.verified} (${verifiedPct}%)`, color: "text-green-400" },
                  { icon: XCircle, label: "Rejected", value: s.rejected, color: "text-red-400" },
                  { icon: Clock, label: "Pending", value: s.pending, color: "text-yellow-400" },
                ].map(c => (
                  <div key={c.label} className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 text-center">
                    <c.icon className={`w-6 h-6 mx-auto mb-2 ${c.color}`} />
                    <p className="text-2xl font-bold text-foreground">{c.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Confidence gauge */}
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 mb-8">
                <h2 className="text-lg font-bold text-foreground mb-3">Average Confidence</h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-green-500 transition-all"
                      style={{ width: `${s.avg_confidence * 100}%` }} />
                  </div>
                  <span className="text-xl font-bold text-foreground">{(s.avg_confidence * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Top Verifiers */}
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-foreground">Top Verifiers</h2>
                </div>
                {s.top_verifiers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No verifications completed yet.</p>
                ) : (
                  <div className="space-y-3">
                    {s.top_verifiers.map((v, i) => (
                      <div key={v.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className="text-lg font-bold text-muted-foreground w-8 text-center">#{i + 1}</span>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {v.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium truncate">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.class} · Rep {v.reputation}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{v.verifications}</p>
                          <p className="text-xs text-muted-foreground">verifications</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </PageWrapper>
  );
};

export default VeroQ;
