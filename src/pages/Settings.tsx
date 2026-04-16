import { useState } from "react";
import { motion } from "framer-motion";
import { SettingsIcon, User, Bell, Monitor, Shield, Link2, Check, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useLanguage, LANG_LABELS, type Lang } from "@/i18n/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface SectionProps {
  icon: any;
  title: string;
  children: React.ReactNode;
}

const Section = ({ icon: Icon, title, children }: SectionProps) => (
  <Card className="p-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </Card>
);

export default function Settings() {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState("Agent Owner");
  const [bio, setBio] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [tgNotif, setTgNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [twoFA, setTwoFA] = useState(false);

  const accounts = [
    { name: "Telegram", connected: true },
    { name: "Twitter", connected: false },
    { name: "GitHub", connected: false },
  ];

  const handleSave = () => {
    toast.success(t("settings.saved") || "Settings saved");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Settings | MEEET World" description="Manage your account settings" />
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-20 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="h-7 w-7 text-primary" />
            <h1 className="text-4xl font-bold">{t("settings.title") || "Settings"}</h1>
          </div>
          <p className="text-muted-foreground">{t("settings.subtitle") || "Manage your profile and preferences"}</p>
        </motion.div>

        <div className="space-y-5">
          <Section icon={User} title={t("settings.profile") || "Profile"}>
            <div>
              <Label htmlFor="name">{t("settings.name") || "Name"}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="bio">{t("settings.bio") || "Bio"}</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." className="mt-1.5" rows={3} />
            </div>
          </Section>

          <Section icon={Bell} title={t("settings.notifications") || "Notifications"}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">Receive updates by email</p>
              </div>
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Telegram</p>
                <p className="text-sm text-muted-foreground">Get notified in Telegram</p>
              </div>
              <Switch checked={tgNotif} onCheckedChange={setTgNotif} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push</p>
                <p className="text-sm text-muted-foreground">Browser push notifications</p>
              </div>
              <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
            </div>
          </Section>

          <Section icon={Monitor} title={t("settings.display") || "Display"}>
            <div>
              <Label>{t("settings.theme") || "Theme"}</Label>
              <div className="flex gap-2 mt-1.5">
                {(["light", "dark", "system"] as const).map((t) => (
                  <Button key={t} size="sm" variant={theme === t ? "default" : "outline"} onClick={() => setTheme(t)} className="capitalize">
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("settings.language") || "Language"}</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                  <Button key={l} size="sm" variant={lang === l ? "default" : "outline"} onClick={() => setLang(l)}>
                    {LANG_LABELS[l]}
                  </Button>
                ))}
              </div>
            </div>
          </Section>

          <Section icon={Shield} title={t("settings.security") || "Security"}>
            <Button variant="outline" className="w-full justify-start">
              {t("settings.changePassword") || "Change Password"}
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.twoFactor") || "Two-Factor Authentication"}</p>
                <p className="text-sm text-muted-foreground">Extra security for your account</p>
              </div>
              <Switch checked={twoFA} onCheckedChange={setTwoFA} />
            </div>
          </Section>

          <Section icon={Link2} title={t("settings.connectedAccounts") || "Connected Accounts"}>
            {accounts.map((acc) => (
              <div key={acc.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{acc.name}</span>
                  {acc.connected ? (
                    <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Connected</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1"><X className="h-3 w-3" /> Not Connected</Badge>
                  )}
                </div>
                <Button size="sm" variant={acc.connected ? "outline" : "default"}>
                  {acc.connected ? "Disconnect" : "Connect"}
                </Button>
              </div>
            ))}
          </Section>

          <div className="flex justify-end pt-2">
            <Button size="lg" onClick={handleSave} className="px-8">
              {t("settings.save") || "Save Changes"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
