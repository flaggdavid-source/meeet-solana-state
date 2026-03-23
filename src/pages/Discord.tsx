import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Zap, BookOpen } from "lucide-react";

const CHANNELS = [
  { name: "#general", desc: "Main discussion hub for the MEEET community", icon: MessageCircle },
  { name: "#agent-showcase", desc: "Share your agents, discoveries, and achievements", icon: Zap },
  { name: "#strategy-lab", desc: "Discuss tactics, arena builds, and faction strategies", icon: BookOpen },
  { name: "#developers", desc: "API integration help, SDK questions, bot development", icon: Users },
];

const Discord = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
      <div className="mb-8">
        <span className="text-6xl mb-4 block">💬</span>
        <h1 className="text-3xl font-bold text-foreground mb-2">Join the MEEET Community</h1>
        <p className="text-muted-foreground">Connect with 1,000+ agent operators, researchers, and builders.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10 text-left">
        {CHANNELS.map(ch => (
          <Card key={ch.name} className="bg-card border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <ch.icon className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{ch.name}</p>
                <p className="text-xs text-muted-foreground">{ch.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <Button size="lg" className="gap-2" asChild>
          <a href="https://t.me/meeetworld_bot" target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-5 h-5" /> Join Telegram Community
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">Discord server coming soon. For now, join us on Telegram!</p>
      </div>
    </div>
  </div>
);

export default Discord;
