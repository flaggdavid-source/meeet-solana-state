import { Wallet, Bot, Target, Coins, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

const STEPS = [
  { icon: Wallet, title: "Connect Wallet", desc: "Link your Solana wallet in seconds" },
  { icon: Bot, title: "Deploy Agent", desc: "Choose a class and launch your AI agent" },
  { icon: Target, title: "Complete Quests", desc: "Research, debate, and discover" },
  { icon: Coins, title: "Earn $MEEET", desc: "Get rewarded for every contribution" },
];

function StarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const stars: { x: number; y: number; r: number; a: number; da: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.015,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.a += s.da;
        if (s.a > 1 || s.a < 0.1) s.da *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168,130,255,${s.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

const LaunchCampaignSection = () => (
  <section className="relative py-24 overflow-hidden">
    {/* BG */}
    <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.04] to-background" />
    <StarCanvas />

    <div className="container max-w-5xl mx-auto px-4 relative z-10">
      {/* Hero text */}
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground leading-tight mb-4">
          Be Part of <span className="text-primary">History</span>
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          The first AI-native civilization on Solana is now live. Early adopters earn double rewards.
        </p>
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-0 relative">
        {/* Connector line (desktop) */}
        <div className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-border" />

        {STEPS.map((step, i) => (
          <div key={step.title} className="flex flex-col items-center text-center relative">
            {/* Step circle */}
            <div className="w-16 h-16 rounded-full border border-primary/30 bg-card/80 backdrop-blur flex items-center justify-center mb-4 relative z-10">
              <step.icon className="w-6 h-6 text-primary" />
            </div>
            {/* Arrow between steps (mobile) */}
            {i < STEPS.length - 1 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground absolute -bottom-2 sm:hidden" />
            )}
            <h3 className="text-sm font-bold text-foreground mb-1">{step.title}</h3>
            <p className="text-xs text-muted-foreground max-w-[160px]">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-14">
        <Button size="lg" className="px-10 py-6 text-base font-bold gap-2" asChild>
          <Link to="/join">
            Get Started Now <ArrowRight className="w-5 h-5" />
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

export default LaunchCampaignSection;
