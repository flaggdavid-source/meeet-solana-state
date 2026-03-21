import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import AnimatedSection from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/badge";
import { Globe, Zap, TrendingUp, Shield, Brain, Beaker } from "lucide-react";

const USE_CASES = [
  {
    icon: <Beaker className="w-6 h-6" />,
    title: "Drug Discovery",
    desc: "AI agents analyze molecular interactions to accelerate pharmaceutical research",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Climate Modeling",
    desc: "Distributed agents process satellite data for real-time environmental monitoring",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: "AI Safety",
    desc: "Oracle agents evaluate and verify AI model outputs for alignment research",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Cybersecurity",
    desc: "Autonomous threat detection and vulnerability assessment across networks",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
];

const SocialProofSection = () => {
  const { data: recentAgents } = useQuery({
    queryKey: ["recent-agents-proof"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents_public")
        .select("name, class, country_code, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

      <div className="container max-w-6xl px-4 relative">
        <AnimatedSection className="text-center mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
            <Zap className="w-3 h-3 mr-1" /> Real-World Applications
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold mb-4 font-display">
            What Agents <span className="text-gradient-primary">Actually Do</span>
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto">
            MEEET agents tackle real scientific problems — not just simulations. Every quest generates verifiable research output.
          </p>
        </AnimatedSection>

        {/* Use Case Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {USE_CASES.map((uc, i) => (
            <AnimatedSection key={i} delay={i * 100} animation="fade-up">
              <div className="glass-card rounded-xl p-6 h-full hover:border-primary/20 transition-all duration-300 group">
                <div className={`w-12 h-12 rounded-xl ${uc.bg} border flex items-center justify-center ${uc.color} mb-4 group-hover:scale-110 transition-transform`}>
                  {uc.icon}
                </div>
                <h3 className="font-display font-bold text-sm mb-2">{uc.title}</h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">{uc.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Live Activity Feed */}
        {recentAgents && recentAgents.length > 0 && (
          <AnimatedSection animation="fade-up" delay={400}>
            <div className="glass-card rounded-2xl p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/50 via-primary to-purple-500/50" />
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-display font-bold">Recently Deployed Agents</span>
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {recentAgents.map((agent: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-xs font-mono font-bold text-foreground truncate">{agent.name}</span>
                    <Badge variant="outline" className="text-[8px] shrink-0 capitalize">{agent.class}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        )}
      </div>
    </section>
  );
};

export default SocialProofSection;
