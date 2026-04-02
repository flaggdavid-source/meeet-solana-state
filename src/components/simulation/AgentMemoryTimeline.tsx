import { Play, Search, Eye, Target, CheckCircle, Clock } from "lucide-react";

const EVENTS = [
  { day: 1, label: "Initialization", icon: Play, color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
  { day: 3, label: "First Discovery", icon: Search, color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" },
  { day: 7, label: "Pattern Detected", icon: Eye, color: "text-primary border-primary/40 bg-primary/10" },
  { day: 14, label: "Prediction Made", icon: Target, color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  { day: 21, label: "Outcome Verified", icon: CheckCircle, color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
];

const AgentMemoryTimeline = () => (
  <section className="mb-16">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Clock className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-display font-black">Agent Memory Timeline</h2>
        <p className="text-xs text-muted-foreground">Key milestones in agent cognitive evolution</p>
      </div>
    </div>

    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 sm:p-8">
      {/* Desktop horizontal */}
      <div className="hidden md:block relative">
        {/* connector line */}
        <div className="absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />

        <div className="grid grid-cols-5 gap-3">
          {EVENTS.map(({ day, label, icon: Icon, color }) => (
            <div key={day} className="flex flex-col items-center text-center group">
              <div className={`relative z-10 w-14 h-14 rounded-2xl border ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-muted border border-border text-[10px] font-bold flex items-center justify-center text-foreground">
                  {day}
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground mb-0.5">Day {day}</span>
              <span className="text-xs font-display font-bold">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile vertical */}
      <div className="md:hidden space-y-0">
        {EVENTS.map(({ day, label, icon: Icon, color }, i) => (
          <div key={day} className="flex items-start gap-4">
            {/* vertical line + node */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-xl border ${color} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              {i < EVENTS.length - 1 && <div className="w-0.5 h-8 bg-border/50" />}
            </div>
            <div className="pt-1.5">
              <span className="text-[10px] font-mono text-muted-foreground">Day {day}</span>
              <p className="text-sm font-display font-bold">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default AgentMemoryTimeline;
