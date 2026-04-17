import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

type IntegrationStatus = "Live" | "In Progress" | "Proposed";

interface Integration {
  icon: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  href?: string;
  cta: string;
}

const INTEGRATIONS: Integration[] = [
  { icon: "🔗", name: "MolTrust", description: "On-chain trust scoring", status: "Live", href: "/integrations/moltrust", cta: "View" },
  { icon: "🛡", name: "APS", description: "Agent Passport System", status: "Live", href: "/trust-api", cta: "View" },
  { icon: "🔮", name: "SkyeProfile", description: "9-dimension trust oracle", status: "Live", href: "/skyeprofile", cta: "View" },
  { icon: "🆔", name: "AgentID", description: "Universal DID resolver", status: "In Progress", cta: "Coming Soon" },
  { icon: "📋", name: "Signet", description: "Hash-chained audit logs", status: "In Progress", cta: "Coming Soon" },
  { icon: "✅", name: "Geodesia G-1", description: "EU AI Act compliance", status: "Proposed", cta: "Coming Soon" },
];

const STATUS_COLOR: Record<IntegrationStatus, string> = {
  "Live": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "In Progress": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Proposed": "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const STATS = [
  { value: 15, label: "Partners" },
  { value: 4, label: "Live Integrations" },
  { value: 6, label: "In Progress" },
  { value: 5, label: "Proposed" },
];

export default function Integrations() {
  return (
    <PageWrapper>
      <SEOHead
        title="Integration Hub — MEEET World"
        description="Connect MEEET with the AI agent ecosystem. MolTrust, APS, SkyeProfile, Signet, AgentID, Geodesia."
        path="/integrations"
      />
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 pt-24 pb-16">
          {/* Hero */}
          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-3">
              Integration Hub
            </h1>
            <p className="text-lg text-muted-foreground">Connect MEEET with the AI agent ecosystem.</p>
          </section>

          {/* Grid */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {INTEGRATIONS.map((i) => {
              const isDisabled = !i.href;
              return (
                <Card key={i.name} className="bg-card/60 border-border hover:border-primary/40 transition-colors group">
                  <CardContent className="pt-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{i.icon}</span>
                      <Badge variant="outline" className={STATUS_COLOR[i.status]}>
                        {i.status === "Live" && (
                          <span className="relative flex h-1.5 w-1.5 mr-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                          </span>
                        )}
                        {i.status}
                      </Badge>
                    </div>
                    <h3 className="font-display font-bold text-lg mb-1">{i.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{i.description}</p>
                    {isDisabled ? (
                      <Button variant="outline" disabled className="w-full opacity-50 cursor-not-allowed">
                        {i.cta}
                      </Button>
                    ) : (
                      <Link to={i.href!} className="block">
                        <Button variant="outline" className="w-full gap-2 group-hover:border-primary/50 group-hover:bg-primary/5">
                          {i.cta} <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* Stats */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {STATS.map((s) => (
              <Card key={s.label} className="bg-card/40 border-border">
                <CardContent className="pt-5 text-center">
                  <div className="text-3xl font-display font-bold text-gradient-primary">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* CTA */}
          <section className="text-center">
            <a href="mailto:partners@meeet.world">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
                <Mail className="w-4 h-4" /> Become Integration Partner
              </Button>
            </a>
          </section>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
}
