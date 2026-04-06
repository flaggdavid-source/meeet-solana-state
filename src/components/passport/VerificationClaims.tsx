import { useEffect, useState } from "react";
import { ShieldCheck, Clock, CheckCircle, XCircle, AlertTriangle, FileCheck } from "lucide-react";

interface Claim {
  id: string;
  agent_id: string;
  verifier_id: string | null;
  claim_type: string;
  target_type: string;
  verification_status: string;
  confidence_score: number;
  veroq_receipt: any;
  created_at: string;
  verified_at: string | null;
}

const STATUS_MAP: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Pending" },
  in_progress: { icon: Clock, color: "text-blue-400", bg: "bg-blue-500/20", label: "In Progress" },
  verified: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20", label: "Verified" },
  rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20", label: "Rejected" },
  disputed: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/20", label: "Disputed" },
  expired: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: "Expired" },
};

const CLAIM_LABELS: Record<string, string> = {
  discovery_accuracy: "Discovery Accuracy",
  research_quality: "Research Quality",
  debate_fairness: "Debate Fairness",
  governance_compliance: "Governance Compliance",
};

export default function VerificationClaims({ agentId }: { agentId?: string }) {
  const [submitted, setSubmitted] = useState<Claim[]>([]);
  const [assigned, setAssigned] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) { setLoading(false); return; }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/veroq-integration/claims/${agentId}`)
      .then(r => r.json())
      .then(d => {
        if (d.submitted) setSubmitted(d.submitted);
        if (d.assigned) setAssigned(d.assigned);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-2xl" />;

  const allClaims = [...submitted, ...assigned];
  const uniqueClaims = allClaims.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          {submitted.length} submitted
        </span>
        <span className="px-3 py-1 rounded-full bg-accent/10 text-accent-foreground text-xs font-semibold">
          {assigned.length} assigned
        </span>
        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold">
          {uniqueClaims.filter(c => c.verification_status === "verified").length} verified
        </span>
      </div>

      {/* Claims list */}
      {uniqueClaims.length === 0 ? (
        <p className="text-sm text-muted-foreground">No verification claims yet.</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {uniqueClaims.slice(0, 10).map(c => {
            const st = STATUS_MAP[c.verification_status] || STATUS_MAP.pending;
            const Icon = st.icon;
            const isSubmitter = c.agent_id === agentId;
            return (
              <div key={c.id} className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-3 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                      <Icon className="w-3 h-3" /> {st.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{isSubmitter ? "Submitted" : "Verifying"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-foreground">{CLAIM_LABELS[c.claim_type] || c.claim_type}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">{c.target_type}</span>
                  {c.confidence_score > 0 && (
                    <span className="text-xs text-primary font-mono">{(c.confidence_score * 100).toFixed(0)}% confidence</span>
                  )}
                  {c.veroq_receipt && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-400">
                      <FileCheck className="w-3 h-3" /> VeroQ Receipt
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
