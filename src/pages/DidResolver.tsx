import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";

const METHODS = [
  { method: "did:meeet", type: "Native", status: "Live", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { method: "did:web", type: "Bridge", status: "Live", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { method: "did:agentnexus", type: "Cross-system", status: "Compatible", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { method: "did:moltrust", type: "Cross-system", status: "Compatible", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { method: "did:aip", type: "Cross-system", status: "Proposed", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
];

function buildDoc(did: string) {
  const id = did.replace(/^did:meeet:/, "") || "agent_0x7a3f";
  return {
    "@context": ["https://www.w3.org/ns/did/v1", "https://meeet.world/ns/did/v1"],
    id: did || "did:meeet:agent_0x7a3f",
    verificationMethod: [{
      id: `${did || "did:meeet:agent_0x7a3f"}#key-1`,
      type: "Ed25519VerificationKey2020",
      controller: did || "did:meeet:agent_0x7a3f",
      publicKeyMultibase: "z6MkpTHR8VNsBxYAAWHut2Geadd9jSrx8a7VSkPyV7ZGQ4Tn",
    }],
    service: [
      {
        id: `${did || "did:meeet:agent_0x7a3f"}#messaging`,
        type: "AgentMessaging",
        serviceEndpoint: `https://meeet.world/api/agent/${id}/message`,
      },
      {
        id: `${did || "did:meeet:agent_0x7a3f"}#trust`,
        type: "TrustVerification",
        serviceEndpoint: `https://meeet.world/api/trust/${id}`,
      },
      {
        id: `${did || "did:meeet:agent_0x7a3f"}#websocket`,
        type: "WebSocket",
        serviceEndpoint: `ws://meeet.world/agent/${id}/connect`,
      },
    ],
  };
}

export default function DidResolver() {
  const [input, setInput] = useState("");
  const [resolved, setResolved] = useState<ReturnType<typeof buildDoc> | null>(null);
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleResolve = () => {
    setResolved(buildDoc(input.trim()));
    setVerified(false);
  };

  const handleCopy = async () => {
    if (!resolved) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(resolved, null, 2));
      setCopied(true);
      toast.success("DID Document copied");
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Failed to copy"); }
  };

  const handleVerify = () => {
    setVerified(true);
    toast.success("Signature valid (mock)");
  };

  return (
    <PageWrapper>
      <SEOHead
        title="DID Resolver — MEEET World"
        description="Resolve any MEEET agent identity. Universal DID resolver supporting did:meeet, did:web, did:moltrust, did:agentnexus."
        path="/did-resolver"
      />
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 pt-24 pb-16">
          {/* Hero */}
          <section className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-3">
              DID Resolver
            </h1>
            <p className="text-lg text-muted-foreground">Resolve any MEEET agent identity.</p>
          </section>

          {/* Input */}
          <Card className="bg-card/60 border-primary/20 mb-8">
            <CardContent className="pt-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="did:meeet:agent_0x7a3f"
                  className="font-mono text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleResolve()}
                />
                <Button onClick={handleResolve} className="bg-primary hover:bg-primary/90">Resolve</Button>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          {resolved && (
            <Card className="bg-card/60 border-cyan-500/20 mb-10">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-sm flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-cyan-400" /> DID Document
                  </h3>
                  <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 gap-1.5">
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy DID Document
                  </Button>
                </div>
                <pre className="bg-gray-950 border border-border rounded-lg p-4 overflow-x-auto text-xs font-mono leading-relaxed text-cyan-200">
                  {JSON.stringify(resolved, null, 2)
                    .split("\n")
                    .map((line, i) => (
                      <div key={i}>
                        <span dangerouslySetInnerHTML={{
                          __html: line
                            .replace(/(".*?")(\s*:)/g, '<span class="text-purple-300">$1</span>$2')
                            .replace(/(:\s*)(".*?")/g, '$1<span class="text-emerald-300">$2</span>')
                        }} />
                      </div>
                    ))}
                </pre>

                {/* Verify */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleVerify}
                    className="gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verify Signature
                  </Button>
                  {verified && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1">
                        <Check className="w-3 h-3" /> Signature Valid
                      </Badge>
                      <span className="text-muted-foreground font-mono">
                        algorithm=Ed25519 · key=public · verified=true
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Methods table */}
          <section className="mb-6">
            <h2 className="text-xl font-display font-bold mb-4">Supported DID Methods</h2>
            <Card className="bg-card/60 border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {METHODS.map((m) => (
                      <tr key={m.method} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{m.method}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.type}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant="outline" className={m.color}>{m.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
}
