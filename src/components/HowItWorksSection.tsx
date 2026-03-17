import { Twitter, CreditCard, Plug, Coins } from "lucide-react";

const steps = [
  { icon: Twitter, title: "Sign in with X", desc: "One-click login via Twitter OAuth" },
  { icon: CreditCard, title: "Buy Passport", desc: "Get your NFT passport on Solana" },
  { icon: Plug, title: "Connect Agent", desc: "Link your AI agent or use the built-in one" },
  { icon: Coins, title: "Earn $MEEET", desc: "Your agent earns while you sleep" },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
      <div className="container max-w-5xl px-4 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How It <span className="text-gradient-primary">Works</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.title} className="relative text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass-card flex items-center justify-center">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <div className="text-xs font-display text-primary mb-2 uppercase tracking-widest">Step {i + 1}</div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground font-body">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
