import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { TrendingUp, Shield, Swords, Zap, Eye } from "lucide-react";

const PARAMS = [
  { key: "volatility", label: "Market Volatility", icon: TrendingUp },
  { key: "governance", label: "Governance Pressure", icon: Shield },
  { key: "aggression", label: "Agent Aggressiveness", icon: Swords },
  { key: "shock", label: "External Shock Probability", icon: Zap },
] as const;

const barColor = (v: number) =>
  v < 30 ? "from-emerald-500 to-emerald-400" :
  v < 60 ? "from-yellow-500 to-amber-400" :
  "from-red-500 to-orange-400";

const ScenarioControlPanel = () => {
  const [values, setValues] = useState<Record<string, number>>({
    volatility: 42,
    governance: 65,
    aggression: 28,
    shock: 15,
  });

  const set = (key: string, v: number[]) =>
    setValues((prev) => ({ ...prev, [key]: v[0] }));

  return (
    <section className="mb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Eye className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-black">Scenario Control Panel</h2>
          <p className="text-xs text-muted-foreground">God's Eye View — tune world parameters in real-time</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 sm:p-8 space-y-7">
        {PARAMS.map(({ key, label, icon: Icon }) => {
          const v = values[key];
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-display font-bold">{label}</span>
                </div>
                <span className="text-sm font-mono font-black tabular-nums">{v}%</span>
              </div>

              {/* color bar behind slider */}
              <div className="relative">
                <div className="absolute inset-0 h-2 rounded-full overflow-hidden top-[7px]">
                  <div
                    className={`h-full bg-gradient-to-r ${barColor(v)} transition-all`}
                    style={{ width: `${v}%` }}
                  />
                </div>
                <Slider
                  value={[v]}
                  max={100}
                  step={1}
                  onValueChange={(val) => set(key, val)}
                  className="relative z-10"
                />
              </div>
            </div>
          );
        })}

        <Button
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold mt-4"
          size="lg"
        >
          <Zap className="w-4 h-4" /> Apply &amp; Re-simulate
        </Button>
      </div>
    </section>
  );
};

export default ScenarioControlPanel;
