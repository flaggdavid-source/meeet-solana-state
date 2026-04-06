import { useEffect, useState } from "react";
import { Shield, CheckCircle, AlertTriangle, Clock, ExternalLink } from "lucide-react";

interface Attestation {
  id: string;
  provider: string;
  format: string;
  parsed_claims: Record<string, any>;
  signature_valid: boolean;
  issuer_did: string;
  subject_did: string;
  issued_at: string | null;
  expires_at: string | null;
  imported_at: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  valid: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20", label: "Valid" },
  expired: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Expired" },
  revoked: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/20", label: "Revoked" },
  pending_verification: { icon: Clock, color: "text-blue-400", bg: "bg-blue-500/20", label: "Pending" },
};

const PROVIDER_CONFIG: Record<string, { name: string; color: string }> = {
  moltrust: { name: "MolTrust", color: "from-cyan-500 to-blue-600" },
  veroq: { name: "VeroQ", color: "from-purple-500 to-pink-600" },
  manual: { name: "Manual", color: "from-gray-500 to-gray-600" },
};

export default function AttestationsSection({ agentId }: { agentId?: string }) {
  const [grouped, setGrouped] = useState<Record<string, Attestation[]>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) { setLoading(false); return; }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/attestation-import/agent/${agentId}`)
      .then(r => r.json())
      .then(d => {
        if (d.attestations) setGrouped(d.attestations);
        if (d.total !== undefined) setTotal(d.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded-2xl" />;
  }

  const providers = Object.keys(grouped);
  const hasData = total > 0;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {providers.map(p => {
          const cfg = PROVIDER_CONFIG[p] || PROVIDER_CONFIG.manual;
          const count = grouped[p]?.length || 0;
          const validCount = grouped[p]?.filter(a => a.status === "valid").length || 0;
          return (
            <div key={p} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${cfg.color} text-white text-xs font-semibold`}>
              <Shield className="w-3 h-3" />
              {cfg.name}: {validCount}/{count} valid
            </div>
          );
        })}
        {!hasData && (
          <p className="text-sm text-muted-foreground">No attestations imported yet.</p>
        )}
      </div>

      {/* Attestation cards */}
      {providers.map(p => (
        <div key={p} className="space-y-2">
          {grouped[p]?.map(att => {
            const st = STATUS_CONFIG[att.status] || STATUS_CONFIG.pending_verification;
            const Icon = st.icon;
            const claims = Object.entries(att.parsed_claims || {}).filter(([k]) => !["iss", "sub", "iat", "exp", "id"].includes(k));
            return (
              <div key={att.id} className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                      <Icon className="w-3 h-3" /> {st.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{att.format.toUpperCase()}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(att.imported_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate mb-1">
                  Issuer: {att.issuer_did || "unknown"}
                </p>
                {claims.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {claims.slice(0, 5).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        {k}: {String(v).substring(0, 20)}
                      </span>
                    ))}
                  </div>
                )}
                {att.expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires: {new Date(att.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
