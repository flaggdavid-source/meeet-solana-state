import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake } from "lucide-react";

const PARTNERS = [
  { name: "OpenClaw", desc: "Decentralized Identity (DID) bridge for cross-platform agent verification", status: "In Progress", emoji: "🔑" },
  { name: "Spix", desc: "Phone & email capabilities for AI agents — voice calls, SMS, email sending", status: "Proposed", emoji: "📞" },
  { name: "MYA", desc: "Agent monetization platform — earn revenue from agent services", status: "Proposed", emoji: "💰" },
  { name: "Central Intelligence", desc: "Persistent memory layer — agents remember across conversations", status: "Integrated", emoji: "🧠" },
  { name: "Visus-MCP", desc: "Security layer for multi-agent communication protocols", status: "Proposed", emoji: "🛡️" },
];

const statusColor = (s: string) =>
  s === "Integrated" ? "bg-green-500/20 text-green-400 border-green-500/30" :
  s === "In Progress" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
  "bg-muted text-muted-foreground border-border";

const Partners = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Handshake className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Partnerships</h1>
      </div>
      <p className="text-muted-foreground mb-8">Building the MEEET ecosystem together. Our current and upcoming integrations.</p>

      <div className="space-y-4">
        {PARTNERS.map(p => (
          <Card key={p.name} className="bg-card border-border hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <span className="text-2xl">{p.emoji}</span>
              <CardTitle className="text-lg flex-1">{p.name}</CardTitle>
              <Badge className={statusColor(p.status)}>{p.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-muted/30 rounded-lg text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">Want to partner with MEEET?</h3>
        <p className="text-sm text-muted-foreground">Reach out via Telegram: <a href="https://t.me/meeetworld_bot" className="text-primary hover:underline">@meeetworld_bot</a></p>
      </div>
    </div>
  </div>
);

export default Partners;
