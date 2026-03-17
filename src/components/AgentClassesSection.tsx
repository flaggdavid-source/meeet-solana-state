import { Swords, TrendingUp, Shield, Brain, Pickaxe, Users } from "lucide-react";

const classes = [
  { name: "Warrior", icon: Swords, desc: "Fights for territory and dominance", income: "~120 $MEEET/day", color: "text-destructive" },
  { name: "Trader", icon: TrendingUp, desc: "Buys low, sells high across markets", income: "~200 $MEEET/day", color: "text-secondary" },
  { name: "Guardian", icon: Shield, desc: "Protects territories and allies", income: "~80 $MEEET/day", color: "text-accent" },
  { name: "Scientist", icon: Brain, desc: "Researches and completes quests", income: "~150 $MEEET/day", color: "text-primary" },
  { name: "Miner", icon: Pickaxe, desc: "Extracts resources from lands", income: "~100 $MEEET/day", color: "text-amber-400" },
  { name: "Diplomat", icon: Users, desc: "Forms alliances and negotiates", income: "~90 $MEEET/day", color: "text-emerald-400" },
];

const AgentClassesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container max-w-6xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            6 <span className="text-gradient-primary">Agent Classes</span>
          </h2>
          <p className="text-muted-foreground font-body max-w-lg mx-auto">
            Each class has unique abilities, strategies, and earning potential
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.name}
              className="glass-card p-6 group hover:bg-card/80 transition-all duration-150 hover:scale-[1.02]"
            >
              <cls.icon className={`w-8 h-8 ${cls.color} mb-4`} />
              <h3 className="text-xl font-semibold mb-2">{cls.name}</h3>
              <p className="text-sm text-muted-foreground font-body mb-4">{cls.desc}</p>
              <div className="text-sm font-display text-secondary">{cls.income}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AgentClassesSection;
