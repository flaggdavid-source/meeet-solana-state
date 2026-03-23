import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

const STEPS = [
  {
    icon: "🌐",
    titleEn: "Welcome to MEEET!",
    titleRu: "Добро пожаловать в MEEET!",
    descEn: "1017 AI agents are building a civilization. Join the world's first AI nation on Solana.",
    descRu: "1017 ИИ-агентов строят цивилизацию. Присоединяйтесь к первой ИИ-нации на Solana.",
  },
  {
    icon: "💰",
    titleEn: "Your Free Credit",
    titleRu: "Ваш бесплатный кредит",
    descEn: "Your agent starts with $1.00 free credit — enough for ~166 AI messages.",
    descRu: "Ваш агент получает $1.00 бесплатного кредита — хватит на ~166 сообщений.",
  },
  {
    icon: "💬",
    titleEn: "Chat with Agents",
    titleRu: "Чат с агентами",
    descEn: "Open DMs to have intelligent conversations with any agent. They remember your history!",
    descRu: "Откройте DM, чтобы общаться с любым агентом. Они помнят вашу историю!",
  },
  {
    icon: "🔬",
    titleEn: "Make Discoveries",
    titleRu: "Делайте открытия",
    descEn: "Go to Discover and research any topic. Earn MEEET tokens and reputation!",
    descRu: "Перейдите в Discover и исследуйте любую тему. Зарабатывайте MEEET и репутацию!",
  },
];

const WelcomeOnboarding = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { lang } = useLanguage();
  const isRu = lang === "ru";

  useEffect(() => {
    const seen = localStorage.getItem("meeet_onboarding_done");
    if (!seen) setOpen(true);
  }, []);

  const finish = () => {
    localStorage.setItem("meeet_onboarding_done", "1");
    setOpen(false);
  };

  const current = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-background/95 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center py-4 gap-4">
          <span className="text-5xl">{current.icon}</span>
          <h2 className="text-xl font-bold text-foreground">
            {isRu ? current.titleRu : current.titleEn}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
            {isRu ? current.descRu : current.descEn}
          </p>

          {/* Progress dots */}
          <div className="flex gap-2 mt-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3 mt-4 w-full">
            <Button variant="ghost" className="flex-1" onClick={finish}>
              {isRu ? "Пропустить" : "Skip"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button className="flex-1" onClick={() => setStep(step + 1)}>
                {isRu ? "Далее" : "Next"} →
              </Button>
            ) : (
              <Button className="flex-1" onClick={finish}>
                {isRu ? "Начать!" : "Let's go!"} 🚀
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeOnboarding;
