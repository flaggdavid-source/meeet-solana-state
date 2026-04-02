import { Cpu, Database, Code2, FileCode2, BrainCircuit } from "lucide-react";

const TECHS = [
  { name: "Solana", icon: Cpu, color: "text-emerald-400" },
  { name: "Supabase", icon: Database, color: "text-green-400" },
  { name: "React", icon: Code2, color: "text-cyan-400" },
  { name: "TypeScript", icon: FileCode2, color: "text-blue-400" },
  { name: "MiroFish", icon: BrainCircuit, color: "text-purple-400" },
];

const KeyIntegrationsSection = () => (
  <section className="py-6">
    <div className="container max-w-5xl mx-auto px-4">
      <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-5">
        Powered By
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        {TECHS.map((t) => (
          <div
            key={t.name}
            className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/40 backdrop-blur-sm px-5 py-3 opacity-80 hover:opacity-100 transition-opacity"
          >
            <t.icon className={`w-5 h-5 ${t.color}`} />
            <span className="text-sm font-semibold text-foreground">{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default KeyIntegrationsSection;
