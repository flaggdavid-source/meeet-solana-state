import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const ReferralBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const visits = parseInt(localStorage.getItem("meeet_visit_count") || "0", 10) + 1;
    localStorage.setItem("meeet_visit_count", String(visits));
    const dismissed = localStorage.getItem("meeet_referral_dismissed");
    if (visits > 1 && !dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("meeet_referral_dismissed", "1");
  };

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Gift className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Invite friends, earn $MEEET</span>
            <span className="text-muted-foreground hidden sm:inline"> — Every new agent you refer earns you 500 $MEEET tokens</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" className="h-8 text-xs">
            <Link to="/referrals">Get Your Referral Link</Link>
          </Button>
          <button onClick={dismiss} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Dismiss referral banner">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralBanner;
