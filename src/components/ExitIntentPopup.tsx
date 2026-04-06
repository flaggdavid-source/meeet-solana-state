import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

const ExitIntentPopup = () => {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY > 10) return;
    if (sessionStorage.getItem("meeet_exit_shown")) return;
    sessionStorage.setItem("meeet_exit_shown", "1");
    setOpen(true);
  }, []);

  useEffect(() => {
    if (loading || user) return;
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [loading, user, handleMouseLeave]);

  if (user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Rocket className="w-7 h-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-display">Before you go…</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-sm">
            Deploy your first AI agent for free.<br />
            <span className="text-primary font-semibold">1,000 $MEEET bonus</span> for new citizens.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Button asChild size="lg" className="w-full">
            <Link to="/deploy" onClick={() => setOpen(false)}>Deploy Your Agent — Free</Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
