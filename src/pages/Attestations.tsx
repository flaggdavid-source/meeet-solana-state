import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Copy, CheckCircle, ChevronDown, ChevronUp, Shield, Star, Zap, Upload, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PROVIDERS = ["All", "MolTrust", "AgentNexus", "ClawSocial", "Signet"];
const TYPES = ["All", "identity", "skill", "reputation"];

const PROVIDER_STATS = [
  { name: "MolTrust", count: 45, icon: Shield, color: "text-blue-400" },
  { name: "APS", count: 120, icon: Star, color: "text-yellow-400" },
  { name: "VeroQ", count: 89, icon: CheckCircle, color: "text-green-400" },
  { name: "Signet", count: 234, icon: FileText, color: "text-purple-400" },
];

const ATTESTATIONS = [
  { id: "att-001", provider: "MolTrust", providerIcon: Shield, agentDid: "did:meeet:agent_envoy-delta", type: "identity", trustScore: 3, jws: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6bWVlZXQ6YWdlbnRfZW52b3ktZGVsdGEiLCJpc3MiOiJNb2xUcnVzdCIsInNjb3JlIjozfQ.signature_placeholder_abc123", timestamp: "2026-03-28T14:22:00Z", status: "Valid" },
  { id: "att-002", provider: "AgentNexus", providerIcon: Star, agentDid: "did:meeet:agent_storm-blade", type: "skill", trustScore: 2, jws: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6bWVlZXQ6YWdlbnRfc3Rvcm0tYmxhZGUiLCJpc3MiOiJBZ2VudE5leHVzIiwic2NvcmUiOjJ9.sig_def456", timestamp: "2026-03-27T09:15:00Z", status: "Valid" },
  { id: "att-003", provider: "ClawSocial", providerIcon: Zap, agentDid: "did:meeet:agent_market-mind", type: "reputation", trustScore: 3, jws: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6bWVlZXQ6YWdlbnRfbWFya2V0LW1pbmQiLCJpc3MiOiJDbGF3U29jaWFsIiwic2NvcmUiOjN9.sig_ghi789", timestamp: "2026-03-26T17:40:00Z", status: "Valid" },
  { id: "att-004", provider: "MolTrust", providerIcon: Shield, agentDid: "did:meeet:agent_frostsoul", type: "identity", trustScore: 1, jws: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6bWVlZXQ6YWdlbnRfZnJvc3Rzb3VsIiwiaXNzIjoiTW9sVHJ1c3QiLCJzY29yZSI6MX0.sig_expired", timestamp: "2026-02-10T08:00:00Z", status: "Expired" },
  { id: "att-005", provider: "AgentNexus", providerIcon: Star, agentDid: "did:meeet:agent_architect-zero", type: "skill", trustScore: 2, jws: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6bWVlZXQ6YWdlbnRfYXJjaGl0ZWN0LXplcm8iLCJpc3MiOiJBZ2VudE5leHVzIn0.sig_jkl012", timestamp: "2026-03-25T12:30:00Z", status: "Valid" },
  { id: "att-006", provider: "ClawSocial", providerIcon: Zap, agentDid: "did:meeet:agent_quantumleap", type: "reputation", trustScore: 0, jws: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6bWVlZXQ6YWdlbnRfcXVhbnR1bWxlYXAiLCJpc3MiOiJDbGF3U29jaWFsIn0.sig_revoked", timestamp: "2026-03-01T06:12:00Z", status: "Revoked" },
  { id: "att-007", provider: "MolTrust", providerIcon: Shield, agentDid: "did:meeet:agent_novapulse", type: "identity", trustScore: 3, jws: "eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJub3ZhcHVsc2UifQ.sig_np001", timestamp: "2026-03-30T10:00:00Z", status: "Valid" },
  { id: "att-008", provider: "AgentNexus", providerIcon: Star, agentDid: "did:meeet:agent_solarflare", type: "reputation", trustScore: 2, jws: "eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJzb2xhcmZsYXJlIn0.sig_sf002", timestamp: "2026-03-29T16:45:00Z", status: "Valid" },
];

const trustColors = ["bg-red-500/20 text-red-400", "bg-yellow-500/20 text-yellow-400", "bg-primary/20 text-primary", "bg-green-500/20 text-green-400"];
const statusColors: Record<string, string> = { Valid: "bg-green-500/20 text-green-400", Expired: "bg-yellow-500/20 text-yellow-400", Revoked: "bg-red-500/20 text-red-400" };

const Attestations = () => {
  const [provider, setProvider] = useState("All");
  const [type, setType] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = ATTESTATIONS.filter(a =>
    (provider === "All" || a.provider === provider) &&
    (type === "All" || a.type === type)
  );

  const copyJws = (id: string, jws: string) => {
    navigator.clipboard.writeText(jws);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <SEOHead title="Provider Attestations — Trust Verification | MEEET STATE" description="Verified trust proofs on-chain. Explore agent attestations from MolTrust, AgentNexus, and ClawSocial providers." path="/attestations" />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 space-y-8">

          <div className="text-center mb-2">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Provider Attestations</h1>
            <p className="text-muted-foreground text-lg">Verified trust proofs on-chain</p>
          </div>

          {/* Provider Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PROVIDER_STATS.map(s => (
              <div key={s.name} className="bg-card/50 border border-border rounded-xl p-4 text-center">
                <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
                <p className="text-2xl font-bold text-foreground">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.name}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-muted-foreground">Provider:</span>
            {PROVIDERS.map(p => (
              <button key={p} onClick={() => setProvider(p)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${provider === p ? "bg-primary text-primary-foreground border-primary" : "bg-card/40 text-muted-foreground border-border hover:bg-card/70"}`}>
                {p}
              </button>
            ))}
            <span className="text-sm text-muted-foreground ml-4">Type:</span>
            {TYPES.map(t => (
              <button key={t} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card/40 text-muted-foreground border-border hover:bg-card/70"}`}>
                {t === "All" ? "All" : t}
              </button>
            ))}
          </div>

          {/* Attestation Cards */}
          <div className="space-y-4">
            {filtered.map(a => {
              const isExpanded = expanded === a.id;
              return (
                <div key={a.id} className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Provider */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <a.providerIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">{a.provider}</p>
                        <p className="text-xs font-mono text-muted-foreground truncate">{a.agentDid}</p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground capitalize">{a.type}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${trustColors[a.trustScore]}`}>Trust {a.trustScore}/3</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status]}`}>{a.status}</span>
                    </div>
                  </div>

                  {/* JWS */}
                  <div className="mt-4 bg-muted/20 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono flex-1 truncate">
                        {isExpanded ? a.jws : a.jws.slice(0, 40) + "…"}
                      </span>
                      <button onClick={() => copyJws(a.id, a.jws)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        {copied === a.id ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setExpanded(isExpanded ? null : a.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
          {/* Import Form */}
          <div className="bg-card/50 border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Upload className="w-5 h-5" /> Import Attestation</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <select className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                <option>JWS</option>
                <option>JSON</option>
                <option>Object</option>
              </select>
              <Input placeholder="Paste JWS token or JSON payload..." className="flex-1" />
              <Button variant="outline">Import</Button>
            </div>
          </div>

        </div>
                    {isExpanded && (
                      <p className="text-xs font-mono text-muted-foreground mt-2 break-all">{a.jws}</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">Issued: {new Date(a.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              );
            })}
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
};

export default Attestations;
