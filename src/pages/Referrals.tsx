import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Users, Gift, TrendingUp, Link2, Loader2 } from "lucide-react";

export default function Referrals() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-referral", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, display_name")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const refCode = profile?.referral_code || "";
  const refLink = refCode ? `${window.location.origin}/join?ref=${refCode}` : "";
  const totalEarned = referrals.reduce((sum, r) => sum + Number(r.total_earned_meeet || 0), 0);
  const activeCount = referrals.filter((r) => r.status !== "pending").length;

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="pt-28 text-center space-y-4 px-4">
          <h1 className="font-display text-2xl font-bold">Sign in to see your referrals</h1>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="relative pt-28 pb-10 px-4">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="border-secondary/30 text-secondary font-mono text-xs">
              <Users className="w-3 h-3 mr-1" /> Referral Network
            </Badge>
            <h1 className="font-display text-3xl font-black">Your Referrals</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Users, label: "Total Referred", value: String(referrals.length) },
              { icon: TrendingUp, label: "Active", value: String(activeCount) },
              { icon: Gift, label: "Earned $MEEET", value: String(totalEarned) },
            ].map((s) => (
              <Card key={s.label} className="glass-card border-border">
                <CardContent className="p-4 text-center space-y-1">
                  <s.icon className="w-4 h-4 mx-auto text-primary" />
                  <p className="font-display text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-body">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Share link */}
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4 text-accent" /> Your Referral Link
              </CardTitle>
              <CardDescription className="text-xs font-body">
                Share this link. You earn <span className="text-foreground font-semibold">3% lifetime</span> commission on referral earnings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <code className="flex-1 bg-background/80 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground truncate">
                  {refLink || "Generating..."}
                </code>
                <Button variant="outline" size="sm" onClick={copyLink} disabled={!refLink} className="shrink-0 gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Referral list */}
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm">Referral History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : referrals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 font-body">
                  No referrals yet. Share your link to start earning!
                </p>
              ) : (
                <div className="space-y-2">
                  {referrals.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 glass-card rounded-lg px-3 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {r.referred_user_id.slice(0, 8)}...
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          r.status === "pending"
                            ? "text-amber-400 border-amber-500/20"
                            : "text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {r.status}
                      </Badge>
                      <span className="text-xs font-display font-bold text-secondary">
                        +{r.total_earned_meeet} $M
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
