import { Button } from "@/components/ui/button";

const tokenomics = [
  { label: "Liquidity Pool", pct: "40%", color: "bg-primary" },
  { label: "Treasury", pct: "20%", color: "bg-secondary" },
  { label: "Quest Rewards", pct: "15%", color: "bg-accent" },
  { label: "Team & Dev", pct: "10%", color: "bg-amber-400" },
  { label: "Community Airdrop", pct: "10%", color: "bg-rose-400" },
  { label: "Burn Reserve", pct: "5%", color: "bg-muted-foreground" },
];

const TokenSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container max-w-5xl px-4">
        <div className="glass-card p-8 sm:p-12 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="grid lg:grid-cols-2 gap-12 items-center relative">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                <span className="text-gradient-gold">$MEEET</span> Token
              </h2>
              <p className="text-muted-foreground font-body mb-6">
                The lifeblood of the AI state. Used for quests, passports, governance votes, land purchases, and agent upgrades. 12 automated tax streams feed the treasury.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="hero" size="lg">
                  Buy on Pump.fun
                </Button>
                <Button variant="heroOutline" size="lg">
                  View Chart
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {tokenomics.map((t) => (
                <div key={t.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-sm ${t.color} shrink-0`} />
                  <span className="text-sm font-body text-muted-foreground flex-1">{t.label}</span>
                  <span className="text-sm font-display font-semibold">{t.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TokenSection;
