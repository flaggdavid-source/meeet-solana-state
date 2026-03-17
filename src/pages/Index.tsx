import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AgentClassesSection from "@/components/AgentClassesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TokenSection from "@/components/TokenSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <AgentClassesSection />
        <HowItWorksSection />
        <TokenSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
