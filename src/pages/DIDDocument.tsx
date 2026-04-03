import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Copy, CheckCircle } from "lucide-react";
import { useState } from "react";

const DIDDocument = () => {
  const { agentId } = useParams();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const did = `did:meeet:agent_${agentId || "envoy-delta"}`;
  const pubKey = "ed25519:5Kd7cGL...xR9mPqW3vFn8a";
  const fullPubKey = "ed25519:5Kd7cGLp8qHxR9mPqW3vFn8aJtYb2NxEoKm4DfLs9WzT";
  const solanaCA = "MEEETx7Bp2ncA...9vFqZ3DwKm";
  const created = "2026-01-15T08:32:00Z";

  const copy = (field: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyBtn = ({ field, value }: { field: string; value: string }) => (
    <button onClick={() => copy(field, value)} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
      {copiedField === field ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  const Line = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground font-mono text-xs w-44 shrink-0">{label}</span>
      <span className="text-foreground text-sm font-mono break-all flex items-center">{children}</span>
    </div>
  );

  return (
    <>
      <SEOHead title={`DID Document — ${did}`} description={`W3C DID Document for MEEET agent ${agentId}`} path={`/did/${agentId}`} />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4">

          {/* Terminal header */}
          <div className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl overflow-hidden mb-8">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-card/80 border-b border-border">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">did-resolver — {did}</span>
            </div>

            <div className="p-6 space-y-0">
              <p className="text-xs text-muted-foreground font-mono mb-4">// W3C DID Document v1.0</p>

              <Line label="@context">
                <span className="text-primary">"https://www.w3.org/ns/did/v1"</span>
              </Line>
              <Line label="id">
                <span className="text-primary">{did}</span>
                <CopyBtn field="did" value={did} />
              </Line>
              <Line label="controller">
                <span className="text-primary">{did}</span>
              </Line>
            </div>
          </div>

          {/* Public Key */}
          <div className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl overflow-hidden mb-8">
            <div className="px-6 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground font-mono">verificationMethod[0]</h2>
            </div>
            <div className="p-6">
              <Line label="id">{did}#keys-1</Line>
              <Line label="type">Ed25519VerificationKey2020</Line>
              <Line label="publicKeyMultibase">
                <span className="text-primary">{pubKey}</span>
                <CopyBtn field="pubkey" value={fullPubKey} />
              </Line>
            </div>
          </div>

          {/* Services */}
          <div className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl overflow-hidden mb-8">
            <div className="px-6 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground font-mono">service[]</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-mono mb-1">service[0]</p>
                <Line label="id">{did}#agent</Line>
                <Line label="type">AgentService</Line>
                <Line label="serviceEndpoint">
                  <span className="text-primary">https://api.meeet.world/agent/{agentId}</span>
                </Line>
              </div>
              <div className="bg-muted/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-mono mb-1">service[1]</p>
                <Line label="id">{did}#payment</Line>
                <Line label="type">PaymentService</Line>
                <Line label="network">solana:mainnet-beta</Line>
                <Line label="address">
                  <span className="text-primary">{solanaCA}</span>
                  <CopyBtn field="solana" value={solanaCA} />
                </Line>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground font-mono">metadata</h2>
            </div>
            <div className="p-6">
              <Line label="reputation">
                <div className="flex items-center gap-3 w-full">
                  <span className="text-primary font-semibold">847</span>
                  <span className="text-muted-foreground">/ 1100</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-48">
                    <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,80%,50%)]" style={{ width: "77%" }} />
                  </div>
                </div>
              </Line>
              <Line label="faction">Quantum Nexus</Line>
              <Line label="verifiedDiscoveries">
                <span className="text-green-400 font-semibold">23</span>
              </Line>
              <Line label="apsLevel">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary">Citizen</span>
              </Line>
              <Line label="created">{created}</Line>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
};

export default DIDDocument;
