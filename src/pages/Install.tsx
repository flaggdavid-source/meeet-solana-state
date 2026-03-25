import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { Download, Smartphone, WifiOff, Zap, Shield, Bell, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: t("install.featInstant"), desc: t("install.featInstantDesc") },
    { icon: WifiOff, title: t("install.featOffline"), desc: t("install.featOfflineDesc") },
    { icon: Bell, title: t("install.featNotif"), desc: t("install.featNotifDesc") },
    { icon: Shield, title: t("install.featSecurity"), desc: t("install.featSecurityDesc") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 sm:pt-24 pb-28 sm:pb-32 max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <Smartphone className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-2 sm:mb-3">
            {t("install.title")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-body max-w-md mx-auto px-2">
            {t("install.subtitle")}
          </p>
        </div>

        {/* Install action */}
        <Card className="glass-card border-primary/20 mb-6 sm:mb-8">
          <CardContent className="p-4 sm:p-6 text-center">
            {isInstalled ? (
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />
                <p className="font-display font-bold text-base sm:text-lg">{t("install.installed")}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("install.installedDesc")}</p>
              </div>
            ) : deferredPrompt ? (
              <div className="flex flex-col items-center gap-3 sm:gap-4">
                <Button size="lg" onClick={handleInstall} className="gap-2 text-sm sm:text-base px-6 sm:px-8">
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" /> {t("install.installBtn")}
                </Button>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t("install.free")}</p>
              </div>
            ) : isIOS ? (
              <div className="space-y-3 sm:space-y-4">
                <p className="font-display font-semibold text-sm sm:text-base">{t("install.iosTitle")}</p>
                <ol className="text-left text-xs sm:text-sm text-muted-foreground space-y-2.5 sm:space-y-3 font-body">
                  {[t("install.iosStep1"), t("install.iosStep2"), t("install.iosStep3")].map((step: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 sm:gap-3">
                      <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] sm:text-xs font-bold">
                        {i + 1}
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                <p className="font-display font-semibold text-sm sm:text-base">{t("install.browserTitle")}</p>
                <p className="text-xs sm:text-sm text-muted-foreground font-body">
                  {t("install.browserDesc")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {features.map((f) => (
            <Card key={f.title} className="glass-card border-border">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:gap-2">
                <f.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <p className="font-display font-semibold text-xs sm:text-sm">{f.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-body">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Install;
