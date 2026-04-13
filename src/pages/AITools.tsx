import { useState, useCallback, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Type, Coins, PenTool, Search, Palette, Share2, Copy, Check, ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  generateNames, categoryLabels, nameCategories, type NameCategory,
  positiveWords, negativeWords, cryptoPrices,
} from "@/data/nameGeneratorData";

// ─── Simple hash util ───
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ─── Tool: Text Analyzer ───
function TextAnalyzer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<null | { sentiment: string; sentimentPct: number; readability: number; topics: string[]; wordCount: number; readTime: string }>(null);

  const analyze = () => {
    if (!text.trim()) return;
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const wc = words.length;
    let pos = 0, neg = 0;
    words.forEach(w => { if (positiveWords.has(w)) pos++; if (negativeWords.has(w)) neg++; });
    const total = pos + neg || 1;
    const sentimentPct = Math.round((pos / total) * 100);
    const sentiment = sentimentPct > 60 ? "Positive" : sentimentPct < 40 ? "Negative" : "Neutral";
    const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
    const syllables = words.reduce((s, w) => s + Math.max(1, w.replace(/[^aeiouy]/g, "").length), 0);
    const readability = Math.min(100, Math.max(1, Math.round(206.835 - 1.015 * (wc / sentences) - 84.6 * (syllables / wc))));
    const freq: Record<string, number> = {};
    words.filter(w => w.length > 3).forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const topics = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
    const readTime = `${Math.max(1, Math.round(wc / 200))} min`;
    setResult({ sentiment, sentimentPct, readability, topics, wordCount: wc, readTime });
  };

  return (
    <div className="space-y-4">
      <Textarea value={text} onChange={e => setText(e.target.value.slice(0, 1000))} placeholder="Paste any text to analyze..." className="min-h-[120px] text-base" />
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">{text.length}/1000</span>
        <Button onClick={analyze} disabled={!text.trim()} size="sm">Analyze</Button>
      </div>
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sentiment</span><span className="font-bold text-foreground">{result.sentiment} ({result.sentimentPct}%)</span></div>
          <Progress value={result.sentimentPct} className="h-2" />
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Readability</span><span className="font-bold text-foreground">{result.readability}/100</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Words / Read time</span><span className="font-bold text-foreground">{result.wordCount} · {result.readTime}</span></div>
          <div className="flex flex-wrap gap-1.5">{result.topics.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{t}</span>)}</div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Tool: Name Generator ───
function NameGenerator() {
  const [category, setCategory] = useState<NameCategory>("startup");
  const [desc, setDesc] = useState("");
  const [names, setNames] = useState<string[]>([]);

  const generate = () => {
    if (!desc.trim()) return;
    setNames(generateNames(category, desc));
  };

  return (
    <div className="space-y-4">
      <Select value={category} onValueChange={v => setCategory(v as NameCategory)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{nameCategories.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}</SelectContent>
      </Select>
      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe it in a few words..." className="text-base" onKeyDown={e => e.key === "Enter" && generate()} />
      <Button onClick={generate} disabled={!desc.trim()} size="sm" className="w-full">Generate Names</Button>
      {names.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2">
          {names.map(n => (
            <button key={n} onClick={() => { navigator.clipboard.writeText(n); toast.success(`Copied: ${n}`); }} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer">
              {n}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ─── Tool: Crypto Portfolio ───
function CryptoPortfolio() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<null | { holdings: { coin: string; amount: number; value: number }[]; total: number; risk: string; grade: string; suggestion: string }>(null);

  const analyze = () => {
    const parts = input.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const holdings: { coin: string; amount: number; value: number }[] = [];
    parts.forEach(p => {
      const m = p.match(/([a-z]+)\s*([\d.]+)/);
      if (m) {
        const coin = m[1];
        const amount = parseFloat(m[2]);
        const price = cryptoPrices[coin] ?? 0;
        holdings.push({ coin: coin.toUpperCase(), amount, value: amount * price });
      }
    });
    if (!holdings.length) { toast.error("Enter holdings like: SOL 100, BTC 0.5"); return; }
    const total = holdings.reduce((s, h) => s + h.value, 0);
    const unique = holdings.length;
    const grade = unique >= 5 ? "A" : unique >= 3 ? "B" : unique >= 2 ? "C" : "D";
    const maxPct = Math.max(...holdings.map(h => h.value / total * 100));
    const risk = maxPct > 70 ? "High" : maxPct > 40 ? "Medium" : "Low";
    const suggestion = risk === "High" ? "Consider diversifying — over 70% in a single asset." : risk === "Medium" ? "Good balance, consider adding uncorrelated assets." : "Well-diversified portfolio. Consider staking for yields.";
    setResult({ holdings, total, risk, grade, suggestion });
  };

  return (
    <div className="space-y-4">
      <Input value={input} onChange={e => setInput(e.target.value)} placeholder="SOL 100, BTC 0.5, ETH 2" className="text-base" onKeyDown={e => e.key === "Enter" && analyze()} />
      <Button onClick={analyze} disabled={!input.trim()} size="sm" className="w-full">Analyze Portfolio</Button>
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Value</span><span className="font-bold text-foreground">${result.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Risk / Grade</span><span className="font-bold text-foreground">{result.risk} · {result.grade}</span></div>
          {/* Simple bar chart */}
          <div className="space-y-1.5">
            {result.holdings.map(h => (
              <div key={h.coin} className="flex items-center gap-2 text-xs">
                <span className="w-10 font-bold text-foreground">{h.coin}</span>
                <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(h.value / result.total * 100)}%` }} />
                </div>
                <span className="w-16 text-right text-muted-foreground">${h.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground italic">{result.suggestion}</p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Tool: Writing Assistant ───
function WritingAssistant() {
  const [text, setText] = useState("");
  const [tone, setTone] = useState("professional");
  const [output, setOutput] = useState("");

  const transform = () => {
    if (!text.trim()) return;
    let t = text;
    switch (tone) {
      case "professional":
        t = t.replace(/\bgood\b/gi, "excellent").replace(/\bbad\b/gi, "suboptimal").replace(/\bget\b/gi, "obtain").replace(/\bbig\b/gi, "substantial").replace(/\bhelp\b/gi, "assist").replace(/\bstart\b/gi, "commence");
        break;
      case "casual":
        t = t.replace(/\bdo not\b/gi, "don't").replace(/\bcannot\b/gi, "can't").replace(/\bwill not\b/gi, "won't").replace(/\bshould\b/gi, "totally should").replace(/\.\s/g, "! ");
        t += " 😊";
        break;
      case "academic":
        t = `It has been observed that ${t.charAt(0).toLowerCase()}${t.slice(1)}`.replace(/\bI think\b/gi, "Evidence suggests").replace(/\bshows\b/gi, "demonstrates").replace(/\bmany\b/gi, "numerous");
        t += " (Further research is warranted.)";
        break;
      case "creative":
        t = t.replace(/\bis\b/gi, "dances as").replace(/\bvery\b/gi, "breathtakingly").replace(/\bimportant\b/gi, "the heartbeat of").replace(/\.\s/g, " — ");
        break;
    }
    setOutput(t);
  };

  return (
    <div className="space-y-4">
      <Textarea value={text} onChange={e => setText(e.target.value.slice(0, 500))} placeholder="Enter text to transform..." className="min-h-[100px] text-base" />
      <Select value={tone} onValueChange={setTone}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="professional">Professional</SelectItem>
          <SelectItem value="casual">Casual</SelectItem>
          <SelectItem value="academic">Academic</SelectItem>
          <SelectItem value="creative">Creative</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={transform} disabled={!text.trim()} size="sm" className="w-full">Transform</Button>
      {output && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-lg border border-primary/20 bg-primary/5">
          <p className="text-sm text-foreground leading-relaxed">{output}</p>
          <button onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied!"); }} className="mt-2 text-[10px] text-primary hover:underline">Copy result</button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Tool: Address Checker ───
function AddressChecker() {
  const [addr, setAddr] = useState("");
  const [result, setResult] = useState<null | { type: string; valid: boolean; formatted: string }>(null);

  const check = () => {
    const a = addr.trim();
    if (!a) return;
    let type = "Unknown", valid = false;
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) { type = "Solana"; valid = true; }
    else if (/^0x[0-9a-fA-F]{40}$/.test(a)) { type = "Ethereum"; valid = true; }
    else if (/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(a)) { type = "Bitcoin"; valid = true; }
    else if (a.length >= 26) { type = "Unknown blockchain"; valid = false; }
    setResult({ type, valid, formatted: `${a.slice(0, 6)}...${a.slice(-4)}` });
  };

  return (
    <div className="space-y-4">
      <Input value={addr} onChange={e => setAddr(e.target.value)} placeholder="Paste any blockchain address..." className="text-base font-mono" onKeyDown={e => e.key === "Enter" && check()} />
      <Button onClick={check} disabled={!addr.trim()} size="sm" className="w-full">Check Address</Button>
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Network</span><span className="font-bold text-foreground">{result.type}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Valid</span><span className={`font-bold ${result.valid ? "text-primary" : "text-destructive"}`}>{result.valid ? "✓ Valid" : "✗ Invalid"}</span></div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{result.formatted}</span>
            <button onClick={() => { navigator.clipboard.writeText(addr.trim()); toast.success("Address copied!"); }} className="p-1 hover:text-foreground text-muted-foreground"><Copy className="w-3 h-3" /></button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Tool: Mood Board ───
function MoodBoard() {
  const [mood, setMood] = useState("");
  const [pref, setPref] = useState("warm");
  const [result, setResult] = useState<null | { colors: string[]; fonts: string[]; desc: string }>(null);

  const palettes: Record<string, string[][]> = {
    warm: [["#FF6B6B", "#FFA07A", "#FFD93D", "#6BCB77", "#4D96FF", "#9B59B6", "#E74C3C", "#F39C12", "#1ABC9C", "#2ECC71", "#3498DB", "#8E44AD", "#C0392B", "#D35400", "#27AE60", "#2980B9"]],
    cool: [["#74B9FF", "#A29BFE", "#6C5CE7", "#00B894", "#81ECEC", "#55EFC4", "#636E72", "#2D3436", "#0984E3", "#6C5CE7", "#00CEC9", "#FDCB6E", "#E17055", "#D63031", "#00B894", "#E84393"]],
    dark: [["#1A1A2E", "#16213E", "#0F3460", "#E94560", "#2C3E50", "#34495E", "#1B1B2F", "#162447", "#1F4068", "#E43F5A", "#1A1A2E", "#0F3460", "#533483", "#E94560", "#2C2C54", "#474787"]],
    pastel: [["#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", "#E8D5F5", "#FCE4EC", "#FFF3E0", "#E8F5E9", "#E3F2FD", "#F3E5F5", "#FBE9E7", "#F1F8E9", "#E0F7FA", "#FFF8E1", "#F9FBE7"]],
  };

  const generate = () => {
    if (!mood.trim()) return;
    const h = hash(mood + pref);
    const pool = palettes[pref]?.[0] ?? palettes.warm[0];
    const colors = Array.from({ length: 16 }, (_, i) => pool[(h + i * 3) % pool.length]);
    const fontPairs = [["Inter", "Georgia"], ["Space Grotesk", "DM Sans"], ["Playfair Display", "Lato"], ["Syne", "Work Sans"]];
    const fonts = fontPairs[h % fontPairs.length];
    const descs = ["Energetic and bold — perfect for statements.", "Calm and refined — ideal for contemplation.", "Mysterious and deep — evokes intrigue.", "Fresh and uplifting — radiates positivity."];
    setResult({ colors, fonts, desc: descs[h % descs.length] });
  };

  return (
    <div className="space-y-4">
      <Input value={mood} onChange={e => setMood(e.target.value)} placeholder="Describe a mood (e.g., serene ocean sunset)" className="text-base" />
      <Select value={pref} onValueChange={setPref}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="warm">Warm</SelectItem>
          <SelectItem value="cool">Cool</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="pastel">Pastel</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={generate} disabled={!mood.trim()} size="sm" className="w-full">Generate Mood Board</Button>
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="grid grid-cols-4 gap-1.5">
            {result.colors.map((c, i) => (
              <button key={i} onClick={() => { navigator.clipboard.writeText(c); toast.success(`Copied ${c}`); }} className="aspect-square rounded-lg cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground"><strong>Fonts:</strong> {result.fonts.join(" + ")}</p>
          <p className="text-xs text-muted-foreground italic">{result.desc}</p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Tool Card Wrapper ───
const tools = [
  { id: "text", icon: <Type className="w-5 h-5" />, title: "AI Text Analyzer", desc: "Sentiment, readability, and key topics", component: TextAnalyzer },
  { id: "names", icon: <Sparkles className="w-5 h-5" />, title: "AI Name Generator", desc: "Generate unique names for anything", component: NameGenerator },
  { id: "crypto", icon: <Coins className="w-5 h-5" />, title: "Crypto Portfolio Analyzer", desc: "Analyze your crypto holdings", component: CryptoPortfolio },
  { id: "writing", icon: <PenTool className="w-5 h-5" />, title: "AI Writing Assistant", desc: "Transform text tone and style", component: WritingAssistant },
  { id: "address", icon: <Search className="w-5 h-5" />, title: "Blockchain Address Checker", desc: "Validate any blockchain address", component: AddressChecker },
  { id: "mood", icon: <Palette className="w-5 h-5" />, title: "AI Mood Board Generator", desc: "Generate color palettes and vibes", component: MoodBoard },
];

const AITools = () => {
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [viewCounts] = useState(() => Object.fromEntries(tools.map(t => [t.id, 1200 + Math.floor(Math.random() * 3000)])));

  const shareResult = (toolTitle: string) => {
    const text = `Just used "${toolTitle}" on @meeet_world — free AI tools, no login needed! 🤖`;
    const url = "https://meeet.world/ai-tools?utm_source=share";
    if (navigator.share) {
      navigator.share({ title: toolTitle, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("Share text copied!");
    }
  };

  return (
    <PageWrapper>
      <SEOHead
        title="Free AI Tools — Text Analyzer, Name Generator & More | MEEET STATE"
        description="Use powerful AI tools for free — text analysis, name generation, crypto portfolio analysis, writing assistance, and more. No login, no wallet required."
        path="/ai-tools"
      />
      <Navbar />

      <main className="min-h-screen pt-14">
        {/* Hero */}
        <section className="relative py-14 sm:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/8" />
          <div className="relative max-w-4xl mx-auto px-4 text-center space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
                100% Free • No Login • No Wallet
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                Free <span className="text-gradient-primary">AI Tools</span> for Everyone
              </h1>
              <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
                Powered by MEEET STATE's AI Agent Network. Pick a tool, get instant results.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool, i) => {
              const isOpen = openTool === tool.id;
              const Tool = tool.component;
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl border bg-card p-5 transition-all ${isOpen ? "border-primary/30 col-span-1 md:col-span-2 lg:col-span-3" : "border-border hover:border-primary/20 cursor-pointer"}`}
                  onClick={() => !isOpen && setOpenTool(tool.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">{tool.icon}</div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">{tool.title}</h3>
                        <p className="text-xs text-muted-foreground">{tool.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{viewCounts[tool.id].toLocaleString()} uses</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-5 space-y-4">
                        <Tool />
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
                          <button onClick={e => { e.stopPropagation(); shareResult(tool.title); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Share2 className="w-3 h-3" /> Share Result
                          </button>
                          <Link to="/explore?utm_source=ai-tools" className="text-xs text-primary hover:underline" onClick={e => e.stopPropagation()}>
                            Want more? Deploy your own AI agent →
                          </Link>
                        </div>
                        <div className="text-center">
                          <button onClick={e => { e.stopPropagation(); setOpenTool(null); }} className="text-xs text-muted-foreground hover:text-foreground">Close tool</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <AnimatedSection className="mt-12">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-primary/20 p-8 text-center space-y-4">
              <p className="text-xs text-muted-foreground">⚡ All tools powered by MEEET STATE</p>
              <h2 className="text-xl font-extrabold text-foreground">Ready for More Power?</h2>
              <p className="text-sm text-muted-foreground">Deploy your own AI agent and unlock unlimited capabilities.</p>
              <div className="flex justify-center gap-3">
                <Link to="/explore?utm_source=ai-tools"><Button className="font-bold gap-2">Deploy Free Agent</Button></Link>
                <Link to="/playground"><Button variant="outline" className="font-bold">Try AI Playground</Button></Link>
              </div>
            </div>
          </AnimatedSection>
        </section>
      </main>

      <Footer />
    </PageWrapper>
  );
};

export default AITools;
