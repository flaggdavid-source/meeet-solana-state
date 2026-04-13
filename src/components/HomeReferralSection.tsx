import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

function getRefCode(): string {
  const stored = localStorage.getItem("meeet_ref_code_v2");
  if (stored) return stored;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MEEET-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  localStorage.setItem("meeet_ref_code_v2", code);
  return code;
}

const HomeReferralSection = () => {
  const [code] = useState(getRefCode);
  const [copied, setCopied] = useState(false);
  const referralLink = `https://meeet.world?ref=${code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnX = () => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(`Join me on MEEET STATE — the first AI nation on Solana! 🤖🌍 Use my code: ${code}`)}&url=${encodeURIComponent(referralLink + "&utm_source=twitter")}`, "_blank", "noopener,noreferrer");
  };

  const shareOnTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink + "&utm_source=telegram")}&text=${encodeURIComponent(`Join MEEET STATE! Code: ${code}`)}`, "_blank", "noopener,noreferrer");
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join MEEET STATE — the first AI nation on Solana! ${referralLink}?utm_source=whatsapp`)}`, "_blank", "noopener,noreferrer");
  };

  const milestones = [
    { friends: 1, reward: "50 $MEEET" },
    { friends: 5, reward: "500 $MEEET" },
    { friends: 10, reward: "2,000 $MEEET + Badge" },
  ];

  return (
    <section className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-6 sm:p-8 space-y-6"
          style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.08)" }}
        >
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-extrabold text-foreground">Invite Friends, Earn $MEEET</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-sm text-muted-foreground">Your Referral Code:</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border font-mono text-sm font-bold text-foreground">
              {code}
              <button onClick={copyLink} className="p-1 hover:text-primary transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={shareOnX} className="text-xs">𝕏 Twitter</Button>
            <Button variant="outline" size="sm" onClick={shareOnTelegram} className="text-xs">📱 Telegram</Button>
            <Button variant="outline" size="sm" onClick={shareOnWhatsApp} className="text-xs">💬 WhatsApp</Button>
            <Button variant="outline" size="sm" onClick={copyLink} className="text-xs">🔗 Copy Link</Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-lg font-bold text-foreground">0</p><p className="text-[10px] text-muted-foreground">Your Referrals</p></div>
            <div><p className="text-lg font-bold text-foreground">0</p><p className="text-[10px] text-muted-foreground">$MEEET Earned</p></div>
            <div><p className="text-lg font-bold text-primary">12,847</p><p className="text-[10px] text-muted-foreground">Global Referrals</p></div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Refer 5 friends to unlock Premium Agent tier</span>
              <span className="font-bold text-foreground">0/5</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>

          <div className="flex flex-wrap gap-3">
            {milestones.map(m => (
              <div key={m.friends} className="px-3 py-1.5 rounded-full text-xs font-medium border bg-muted/30 text-muted-foreground border-border">
                {m.friends} friend{m.friends > 1 ? "s" : ""} = {m.reward}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HomeReferralSection;
