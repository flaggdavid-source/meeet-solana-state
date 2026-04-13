import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { globalCities, liveEventTemplates } from "@/data/nameGeneratorData";

const HomeViralTicker = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % (globalCities.length * liveEventTemplates.length)), 4000);
    return () => clearInterval(iv);
  }, []);

  const city = globalCities[idx % globalCities.length];
  const event = liveEventTemplates[idx % liveEventTemplates.length];

  return (
    <section className="py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm px-4 py-3 overflow-hidden">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-foreground">People joining right now</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-foreground"
            >
              🌍 User from <strong>{city}</strong> {event}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default HomeViralTicker;
