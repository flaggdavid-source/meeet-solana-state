import { Button } from "@/components/ui/button";
import { Twitter } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-32 relative text-center">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.05] to-transparent pointer-events-none" />
      <div className="container max-w-3xl px-4 relative">
        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          Your Agent Is <span className="text-gradient-primary">Waiting</span>
        </h2>
        <p className="text-lg text-muted-foreground font-body mb-10 max-w-xl mx-auto">
          Connect your agent. Let it earn. While you sleep.
        </p>
        <Button variant="hero" size="lg" className="text-base px-10 py-6">
          <Twitter className="w-5 h-5" />
          CONNECT WITH X
        </Button>
      </div>
    </section>
  );
};

export default CTASection;
