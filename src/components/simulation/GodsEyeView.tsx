import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X, Eye, Zap, Send, Clock, Activity, Users,
  TrendingUp, TrendingDown, BarChart3, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

/* ── types ── */
interface SimEvent {
  id: string;
  event_type: string;
  description: string;
  intensity: number;
  affected_civilizations: string[];
  cascade_result: CascadeResult | null;
  token_cost: number;
  created_at: string;
}

interface CascadeResult {
  affected_nodes: number;
  sentiment_shifts: Record<string, number>;
  discoveries_triggered: number;
  agents_affected: number;
  ripples: Ripple[];
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface GraphNode {
  id: string;
  name: string;
  civilization: string;
  x: number;
  y: number;
  radius: number;
  impact: number;
  glow: number;
  glowColor: string;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number;
  pulse: number;
}

/* ── constants ── */
const CIVILIZATIONS = [
  { key: "AI Core", color: "hsl(217 91% 60%)" },
  { key: "Biotech", color: "hsl(160 84% 39%)" },
  { key: "Energy", color: "hsl(38 92% 50%)" },
  { key: "Quantum", color: "hsl(263 70% 50%)" },
  { key: "Space", color: "hsl(330 81% 60%)" },
];

const EVENT_TYPES = [
  "Technology Breakthrough",
  "Market Event",
  "Policy Change",
  "Discovery",
  "Conflict",
  "Alliance",
];

const CIV_COLORS: Record<string, string> = Object.fromEntries(
  CIVILIZATIONS.map((c) => [c.key, c.color])
);

/* ── helpers ── */
function generateMockGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const cx = 400, cy = 300;

  CIVILIZATIONS.forEach((civ, ci) => {
    const angle = (ci / 5) * Math.PI * 2 - Math.PI / 2;
    const dist = 160;
    const bx = cx + Math.cos(angle) * dist;
    const by = cy + Math.sin(angle) * dist;

    for (let i = 0; i < 8; i++) {
      const a2 = angle + (Math.random() - 0.5) * 1.2;
      const d2 = 40 + Math.random() * 100;
      nodes.push({
        id: `${civ.key}-${i}`,
        name: `${civ.key} Node ${i + 1}`,
        civilization: civ.key,
        x: bx + Math.cos(a2) * d2,
        y: by + Math.sin(a2) * d2,
        radius: 4 + Math.random() * 8,
        impact: Math.random(),
        glow: 0,
        glowColor: civ.color,
      });
    }
  });

  // edges within civ
  CIVILIZATIONS.forEach((civ) => {
    const civNodes = nodes.filter((n) => n.civilization === civ.key);
    for (let i = 0; i < civNodes.length - 1; i++) {
      edges.push({ source: civNodes[i].id, target: civNodes[i + 1].id, strength: 0.5 + Math.random() * 0.5, pulse: 0 });
    }
    // random cross
    if (civNodes.length > 2) {
      edges.push({ source: civNodes[0].id, target: civNodes[civNodes.length - 1].id, strength: 0.3, pulse: 0 });
    }
  });

  // cross-civ edges
  for (let i = 0; i < 8; i++) {
    const a = nodes[Math.floor(Math.random() * nodes.length)];
    const b = nodes[Math.floor(Math.random() * nodes.length)];
    if (a.civilization !== b.civilization) {
      edges.push({ source: a.id, target: b.id, strength: 0.2 + Math.random() * 0.3, pulse: 0 });
    }
  }

  return { nodes, edges };
}

function simulateCascade(
  civs: string[],
  intensity: number,
  graph: { nodes: GraphNode[]; edges: GraphEdge[] }
): CascadeResult {
  const affected = new Set<string>();
  const sentimentShifts: Record<string, number> = {};

  // seed affected nodes
  graph.nodes.forEach((n) => {
    if (civs.includes(n.civilization)) {
      affected.add(n.id);
    }
  });

  // propagate
  for (let depth = 0; depth < Math.min(intensity, 5); depth++) {
    const next = new Set(affected);
    graph.edges.forEach((e) => {
      if (affected.has(e.source)) next.add(e.target);
      if (affected.has(e.target)) next.add(e.source);
    });
    next.forEach((id) => affected.add(id));
  }

  CIVILIZATIONS.forEach((c) => {
    const civAffected = [...affected].filter((id) =>
      graph.nodes.find((n) => n.id === id)?.civilization === c.key
    ).length;
    const total = graph.nodes.filter((n) => n.civilization === c.key).length;
    const base = civs.includes(c.key) ? intensity * 8 : 0;
    sentimentShifts[c.key] = Math.round(
      ((civAffected / Math.max(total, 1)) * intensity * 10 + base) * (Math.random() > 0.4 ? 1 : -1)
    );
  });

  return {
    affected_nodes: affected.size,
    sentiment_shifts: sentimentShifts,
    discoveries_triggered: Math.floor(intensity * 0.7 + Math.random() * 3),
    agents_affected: Math.floor(affected.size * 1.5 + Math.random() * 10),
    ripples: [],
  };
}

/* ── component ── */
export default function GodsEyeView({ onClose }: { onClose: () => void }) {
  /* state */
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [selectedCivs, setSelectedCivs] = useState<string[]>(["AI Core"]);
  const [intensity, setIntensity] = useState(5);
  const [description, setDescription] = useState("");
  const [injecting, setInjecting] = useState(false);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [latestCascade, setLatestCascade] = useState<CascadeResult | null>(null);
  const [cascadeCount, setCascadeCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef(generateMockGraph());
  const ripplesRef = useRef<Ripple[]>([]);
  const animRef = useRef(0);

  /* load existing events */
  useEffect(() => {
    supabase
      .from("simulation_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setEvents(data as unknown as SimEvent[]);
      });
  }, []);

  /* realtime */
  useRealtimeSubscription("simulation_events", () => {
    supabase
      .from("simulation_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setEvents(data as unknown as SimEvent[]);
      });
  });

  /* toggle civ */
  const toggleCiv = useCallback((civ: string) => {
    setSelectedCivs((prev) =>
      prev.includes(civ) ? prev.filter((c) => c !== civ) : [...prev, civ]
    );
  }, []);

  /* inject */
  const handleInject = useCallback(async () => {
    if (!description.trim() || selectedCivs.length === 0) return;
    setInjecting(true);

    const cascade = simulateCascade(selectedCivs, intensity, graphRef.current);
    const cost = intensity * 10;

    // persist
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (userId) {
      await supabase.from("simulation_events").insert({
        injected_by: userId,
        event_type: eventType,
        description: description.trim(),
        intensity,
        affected_civilizations: selectedCivs,
        cascade_result: cascade as unknown as Record<string, unknown>,
        token_cost: cost,
      });
    }

    setLatestCascade(cascade);
    setCascadeCount(cascade.affected_nodes);

    // trigger visual ripples
    selectedCivs.forEach((civ) => {
      const civNodes = graphRef.current.nodes.filter((n) => n.civilization === civ);
      civNodes.forEach((n) => {
        ripplesRef.current.push({
          x: n.x,
          y: n.y,
          radius: 0,
          maxRadius: 40 + intensity * 8,
          color: CIV_COLORS[civ] || "hsl(217 91% 60%)",
          alpha: 1,
        });
        n.glow = 1;
      });
    });

    // glow propagation
    const graph = graphRef.current;
    const affected = new Set(
      graph.nodes.filter((n) => selectedCivs.includes(n.civilization)).map((n) => n.id)
    );
    graph.edges.forEach((e) => {
      if (affected.has(e.source) || affected.has(e.target)) {
        e.pulse = 1;
        const targetNode = graph.nodes.find(
          (n) => n.id === (affected.has(e.source) ? e.target : e.source)
        );
        if (targetNode) targetNode.glow = 0.6;
      }
    });

    setDescription("");
    setInjecting(false);
  }, [eventType, selectedCivs, intensity, description]);

  /* canvas animation */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // bg grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      const graph = graphRef.current;
      const sx = w / 800, sy = h / 600;

      // edges
      graph.edges.forEach((e) => {
        const src = graph.nodes.find((n) => n.id === e.source);
        const tgt = graph.nodes.find((n) => n.id === e.target);
        if (!src || !tgt) return;

        ctx.beginPath();
        ctx.moveTo(src.x * sx, src.y * sy);
        ctx.lineTo(tgt.x * sx, tgt.y * sy);

        if (e.pulse > 0.01) {
          ctx.strokeStyle = `rgba(139,92,246,${0.3 + e.pulse * 0.7})`;
          ctx.lineWidth = 1 + e.pulse * 2;
          e.pulse *= 0.97;
        } else {
          ctx.strokeStyle = `rgba(255,255,255,${0.06 + e.strength * 0.08})`;
          ctx.lineWidth = 0.5;
          e.pulse = 0;
        }
        ctx.stroke();
      });

      // nodes
      graph.nodes.forEach((n) => {
        const nx = n.x * sx, ny = n.y * sy;

        // glow
        if (n.glow > 0.01) {
          const gradient = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.radius * 4);
          gradient.addColorStop(0, n.glowColor.replace(")", `, ${n.glow * 0.5})`).replace("hsl", "hsla"));
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(nx, ny, n.radius * 4, 0, Math.PI * 2);
          ctx.fill();
          n.glow *= 0.99;
        }

        ctx.beginPath();
        ctx.arc(nx, ny, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.glowColor;
        ctx.globalAlpha = 0.6 + n.glow * 0.4;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // ripples
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 1.5;
        r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);
        if (r.alpha <= 0) { ripples.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(r.x * sx, r.y * sy, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color.replace(")", `, ${r.alpha * 0.6})`).replace("hsl", "hsla");
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const tokenCost = intensity * 10;

  const predictions = useMemo(() => {
    if (!latestCascade) return [];
    return [
      { label: "Agent behavior shifts within 2 cycles", confidence: 70 + intensity * 2 },
      { label: "New cross-civ alliances form", confidence: 40 + intensity * 4 },
      { label: "Discovery rate increases by " + (intensity * 3) + "%", confidence: 55 + intensity * 3 },
    ];
  }, [latestCascade, intensity]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-fade-in">
      {/* header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Eye className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">God&apos;s-Eye View</h1>
            <p className="text-[10px] text-gray-500">Simulation Control Panel</p>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {cascadeCount > 0 && (
            <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30 text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              {cascadeCount} nodes affected
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT — Control Center */}
        <div className="lg:w-[30%] border-r border-white/5 p-4 overflow-y-auto space-y-5">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-400" /> Inject Event
            </h2>

            {/* event type */}
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Event Type</label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="bg-white/5 border-white/10 text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* civilizations */}
            <label className="block text-[10px] text-gray-500 uppercase mt-3 mb-2">Affected Civilizations</label>
            <div className="space-y-1.5">
              {CIVILIZATIONS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 cursor-pointer group">
                  <Checkbox
                    checked={selectedCivs.includes(c.key)}
                    onCheckedChange={() => toggleCiv(c.key)}
                    className="border-white/20"
                  />
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{c.key}</span>
                </label>
              ))}
            </div>

            {/* intensity */}
            <label className="block text-[10px] text-gray-500 uppercase mt-3 mb-2">
              Intensity: <span className="text-purple-400 font-bold">{intensity}</span>/10
            </label>
            <Slider
              value={[intensity]}
              onValueChange={([v]) => setIntensity(v)}
              min={1}
              max={10}
              step={1}
              className="mb-3"
            />

            {/* description */}
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the event scenario..."
              className="w-full h-20 rounded-lg bg-white/5 border border-white/10 p-2.5 text-xs text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-purple-500/50"
            />

            {/* cost + inject */}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-gray-500">
                Cost: <span className="text-amber-400 font-bold">{tokenCost} $MEEET</span>
              </span>
              <Button
                size="sm"
                onClick={handleInject}
                disabled={injecting || !description.trim() || selectedCivs.length === 0}
                className="gap-1.5 bg-purple-600 hover:bg-purple-500 text-xs h-8"
              >
                <Send className="w-3 h-3" /> Inject
              </Button>
            </div>
          </div>

          {/* history */}
          <div>
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Event History
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {events.length === 0 && (
                <p className="text-[10px] text-gray-600 italic">No events yet</p>
              )}
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg bg-white/[0.03] border border-white/5 p-2.5 hover:border-purple-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-purple-500/30 text-purple-300">
                      {ev.event_type}
                    </Badge>
                    <span className="text-[9px] text-gray-600 font-mono">
                      I:{ev.intensity}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 line-clamp-2">{ev.description}</p>
                  <div className="flex gap-1 mt-1">
                    {ev.affected_civilizations?.map((c) => (
                      <span
                        key={c}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: CIV_COLORS[c] }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER — Visualization */}
        <div className="lg:w-[50%] relative flex-1">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {/* legend */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {CIVILIZATIONS.map((c) => (
              <div key={c.key} className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 border border-white/5">
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                <span className="text-[9px] text-gray-400">{c.key}</span>
              </div>
            ))}
          </div>
          {cascadeCount > 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-bold animate-pulse">
              Cascade: {cascadeCount} entities reached
            </div>
          )}
        </div>

        {/* RIGHT — Impact Analysis */}
        <div className="lg:w-[20%] border-l border-white/5 p-4 overflow-y-auto space-y-5">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" /> Impact Analysis
          </h2>

          {/* metrics */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Users, label: "Agents", value: latestCascade?.agents_affected ?? 0 },
              { icon: Sparkles, label: "Discoveries", value: latestCascade?.discoveries_triggered ?? 0 },
              { icon: Activity, label: "Nodes Hit", value: latestCascade?.affected_nodes ?? 0 },
              { icon: Zap, label: "Intensity", value: intensity },
            ].map((m) => (
              <div key={m.label} className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-center">
                <m.icon className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white tabular-nums">{m.value}</p>
                <p className="text-[9px] text-gray-500">{m.label}</p>
              </div>
            ))}
          </div>

          {/* sentiment bars */}
          <div>
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              Sentiment Shifts
            </h3>
            <div className="space-y-2">
              {CIVILIZATIONS.map((c) => {
                const shift = latestCascade?.sentiment_shifts?.[c.key] ?? 0;
                const isPositive = shift >= 0;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                        <span className="text-[10px] text-gray-400">{c.key}</span>
                      </div>
                      <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {isPositive ? "+" : ""}{shift}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(Math.abs(shift), 100)}%`,
                          background: isPositive ? "hsl(160 84% 39%)" : "hsl(0 84% 60%)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* predictions */}
          <div>
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              Predicted Outcomes
            </h3>
            {predictions.length === 0 ? (
              <p className="text-[10px] text-gray-600 italic">Inject an event to see predictions</p>
            ) : (
              <div className="space-y-2">
                {predictions.map((p, i) => (
                  <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
                    <p className="text-[10px] text-gray-300 mb-1">{p.label}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all duration-700"
                          style={{ width: `${Math.min(p.confidence, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-purple-300 font-bold tabular-nums">
                        {Math.min(p.confidence, 99)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
