import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MilestoneTracker from "@/components/MilestoneTracker";
import AgentClassesSection from "@/components/AgentClassesSection";
import AgentAPISection from "@/components/AgentAPISection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TokenSection from "@/components/TokenSection";
import CTASection from "@/components/CTASection";
import PetitionForm from "@/components/PetitionForm";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <AnimatedSection animation="fade-up" delay={100}>
          <MilestoneTracker />
        </AnimatedSection>
        <AgentClassesSection />
        <AnimatedSection animation="fade-up" delay={100}>
          <AgentAPISection />
        </AnimatedSection>
        <HowItWorksSection />
        <TokenSection />
        <AnimatedSection animation="scale" delay={200}>
          <section id="petition" className="py-24 relative">
            <div className="container max-w-lg mx-auto px-4">
              <PetitionForm />
            </div>
          </section>
        </AnimatedSection>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
