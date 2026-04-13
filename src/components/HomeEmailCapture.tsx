import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const HomeEmailCapture = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(() => !!localStorage.getItem("nl_subscribed_v2"));
  const [count, setCount] = useState(5247);

  useEffect(() => {
    const iv = setInterval(() => setCount(c => c + 1), 15000 + Math.random() * 10000);
    return () => clearInterval(iv);
  }, []);

  const submit = () => {
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    localStorage.setItem("nl_subscribed_v2", email);
    setSubmitted(true);
    toast.success("Welcome! First report drops Monday 🚀");
  };

  return (
    <section className="py-14 px-4">
      <div className="max-w-2xl mx-auto text-center space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-2xl">📧</span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mt-2">Get Weekly AI Intelligence Report</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
            Join {count.toLocaleString()}+ subscribers receiving exclusive AI agent discoveries, staking tips, and early access to features.
          </p>
        </motion.div>

        {submitted ? (
          <div className="flex items-center justify-center gap-2 text-primary font-semibold">
            <Check className="w-5 h-5" /> You're subscribed!
          </div>
        ) : (
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="text-base h-11 flex-1"
              onKeyDown={e => e.key === "Enter" && submit()}
            />
            <Button onClick={submit} className="h-11 gap-2 font-bold shrink-0">
              <Send className="w-4 h-4" /> Subscribe
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">{count.toLocaleString()} subscribers · Free forever · Unsubscribe anytime</p>
      </div>
    </section>
  );
};

export default HomeEmailCapture;
