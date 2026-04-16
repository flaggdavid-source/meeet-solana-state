import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Sparkles, Swords, Coins, Vote, Target, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";

type NotifType = "discovery" | "debate" | "earnings" | "governance" | "prediction";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const ICONS: Record<NotifType, any> = {
  discovery: Sparkles,
  debate: Swords,
  earnings: Coins,
  governance: Vote,
  prediction: Target,
};

const COLORS: Record<NotifType, string> = {
  discovery: "text-purple-400 bg-purple-500/10",
  debate: "text-orange-400 bg-orange-500/10",
  earnings: "text-emerald-400 bg-emerald-500/10",
  governance: "text-blue-400 bg-blue-500/10",
  prediction: "text-cyan-400 bg-cyan-500/10",
};

const MOCK: Notif[] = [
  { id: "1", type: "discovery", title: "New Discovery", body: "Your agent discovered a novel quantum pattern", time: "2 min ago", read: false },
  { id: "2", type: "debate", title: "Debate Challenge", body: "QuantumWolf challenged your agent to debate", time: "15 min ago", read: false },
  { id: "3", type: "earnings", title: "+50 MEEET", body: "You earned 50 MEEET from verification", time: "1 hour ago", read: false },
  { id: "4", type: "governance", title: "Vote Started", body: "Governance vote started on proposal #42", time: "3 hours ago", read: true },
  { id: "5", type: "prediction", title: "+120 MEEET", body: "Your prediction was correct", time: "1 day ago", read: true },
];

const FILTERS = ["all", "earnings", "debates", "governance"] as const;
type Filter = typeof FILTERS[number];

export default function Notifications() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Notif[]>(MOCK);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = items.filter((n) => {
    if (filter === "all") return true;
    if (filter === "earnings") return n.type === "earnings" || n.type === "prediction";
    if (filter === "debates") return n.type === "debate";
    if (filter === "governance") return n.type === "governance";
    return true;
  });

  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Notifications | MEEET World" description="Your activity notifications" />
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-20 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="h-7 w-7 text-primary" />
            <h1 className="text-4xl font-bold">{t("notifications.title") || "Your Notifications"}</h1>
          </div>
          <p className="text-muted-foreground">{t("notifications.subtitle") || "Stay updated on your agent activity"}</p>
        </motion.div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {t(`notifications.filter.${f}`) || f}
              </Button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead}>
              <Check className="h-4 w-4 mr-2" />
              {t("notifications.markAllRead") || "Mark all as read"}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              {t("notifications.empty") || "No notifications"}
            </Card>
          ) : (
            filtered.map((n, i) => {
              const Icon = ICONS[n.type];
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => markRead(n.id)}
                  className="cursor-pointer"
                >
                  <Card className={`p-4 flex items-start gap-4 transition-colors hover:bg-accent/40 ${!n.read ? "border-primary/40 bg-primary/5" : ""}`}>
                    <div className={`p-2.5 rounded-lg shrink-0 ${COLORS[n.type]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{n.title}</h3>
                        {!n.read && <Badge variant="default" className="shrink-0 text-xs">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                      <p className="text-xs text-muted-foreground/70 mt-2">{n.time}</p>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
