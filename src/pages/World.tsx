import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, X } from "lucide-react";

// ── Faction config ──
const FACTIONS = [
  { key: "ai", label: "AI CORE", icon: "🤖", classes: ["trader", "diplomat"], color: "#3B82F6", hsl: "217,91%,60%" },
  { key: "biotech", label: "BIOTECH", icon: "🧬", classes: ["oracle"], color: "#22C55E", hsl: "142,71%,45%" },
  { key: "energy", label: "ENERGY", icon: "⚡", classes: ["miner"], color: "#F59E0B", hsl: "38,92%,50%" },
  { key: "space", label: "SPACE", icon: "🚀", classes: ["warrior", "scout"], color: "#06B6D4", hsl: "189,94%,43%" },
  { key: "quantum", label: "QUANTUM", icon: "⚛️", classes: ["banker"], color: "#A855F7", hsl: "271,91%,65%" },
];

interface AgentData {
  id: string; name: string; class: string; level: number;
  reputation: number; balance_meeet: number; status: string;
}

function classToFaction(cls: string): string {
  for (const f of FACTIONS) if (f.classes.includes(cls)) return f.key;
  return "ai";
}

// Pentagon positions (angle in radians, 0 = top)
const pentagonAngle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;

const World = () => {
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);
  const [totalDebates, setTotalDebates] = useState(0);
  const [totalMeeet, setTotalMeeet] = useState(0);
  const [totalLaws, setTotalLaws] = useState(0);
  const [toasts, setToasts] = useState<Array<{ id: string; text: string; icon: string; time: number }>>([]);
  const [hoveredFaction, setHoveredFaction] = useState<string | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<{ agent: AgentData; x: number; y: number } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [recentEvents, setRecentEvents] = useState<Array<{ title: string; agent_name: string; faction: string }>>([]);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }>>([]);

  // ── Fetch data ──
  useEffect(() => {
    const fetchAll = async () => {
      const [agentsRes, discRes, duelsRes, meeetRes, lawsRes] = await Promise.all([
        supabase.from("agents_public").select("id, name, class, level, reputation, balance_meeet, status").eq("status", "active").order("reputation", { ascending: false }).limit(500),
        supabase.from("discoveries").select("*", { count: "exact", head: true }),
        supabase.from("duels").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("agents").select("balance_meeet"),
        supabase.from("laws").select("*", { count: "exact", head: true }).eq("status", "passed"),
      ]);
      if (agentsRes.data) setAgents(agentsRes.data as AgentData[]);
      setTotalDiscoveries(discRes.count ?? 0);
      setTotalDebates(duelsRes.count ?? 0);
      if (meeetRes.data) setTotalMeeet(meeetRes.data.reduce((s, a) => s + (a.balance_meeet || 0), 0));
      setTotalLaws(lawsRes.count ?? 0);
    };
    fetchAll();
  }, []);

  // Fetch recent events for toasts
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("discoveries")
        .select("title, agent_id")
        .order("created_at", { ascending: false }).limit(10);
      if (data) {
        setRecentEvents(data.map(d => ({
          title: d.title?.slice(0, 60) || "New discovery",
          agent_name: "Agent",
          faction: "AI",
        })));
      }
    };
    fetchEvents();
  }, []);

  // Toast rotation
  useEffect(() => {
    if (recentEvents.length === 0) return;
    let idx = 0;
    const iv = setInterval(() => {
      const ev = recentEvents[idx % recentEvents.length];
      const icons = ["🔬", "⚔️", "🧬", "💰", "🏛"];
      const icon = icons[idx % icons.length];
      const id = `${Date.now()}`;
      setToasts(prev => [...prev.slice(-2), { id, text: `${ev.title}`, icon, time: Date.now() }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
      idx++;
    }, 8000);
    return () => clearInterval(iv);
  }, [recentEvents]);

  // Faction data
  const factionData = useMemo(() => {
    const groups: Record<string, AgentData[]> = {};
    FACTIONS.forEach(f => { groups[f.key] = []; });
    agents.forEach(a => {
      const fk = classToFaction(a.class);
      if (groups[fk]) groups[fk].push(a);
    });
    return groups;
  }, [agents]);

  const totalAgents = agents.length;

  // Mouse tracking for parallax
  useEffect(() => {
    const handler = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // ═══ CANVAS RENDERING ═══
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isMobile) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let running = true;
    let lastTime = 0;
    const TARGET_FPS = 30;
    const FRAME_TIME = 1000 / TARGET_FPS;

    const animate = (timestamp: number) => {
      if (!running) return;
      const delta = timestamp - lastTime;
      if (delta < FRAME_TIME) { requestAnimationFrame(animate); return; }
      lastTime = timestamp;
      frameRef.current++;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rw = Math.floor(w * dpr);
      const rh = Math.floor(h * dpr);
      if (canvas.width !== rw || canvas.height !== rh) { canvas.width = rw; canvas.height = rh; }

      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, rw, rh);

      const cx = rw / 2;
      const cy = rh / 2;
      const frame = frameRef.current;
      const mx = (mouseRef.current.x / w - 0.5) * 2;
      const my = (mouseRef.current.y / h - 0.5) * 2;

      // ── Star field background ──
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      for (let i = 0; i < 80; i++) {
        const sx = ((i * 137.5 + 50) % rw);
        const sy = ((i * 97.3 + 30) % rh);
        ctx.fillRect(sx, sy, dpr, dpr);
      }

      // ── Pentagon radius ──
      const pentRadius = Math.min(rw, rh) * 0.32;

      // ── Connection lines to center ──
      FACTIONS.forEach((f, i) => {
        const angle = pentagonAngle(i);
        const fx = cx + Math.cos(angle) * pentRadius + mx * 8 * dpr;
        const fy = cy + Math.sin(angle) * pentRadius + my * 8 * dpr;
        const count = factionData[f.key]?.length || 0;
        const lineWidth = Math.max(1, Math.min(3, count / 80)) * dpr;

        // Line to center
        const grad = ctx.createLinearGradient(cx, cy, fx, fy);
        grad.addColorStop(0, `hsla(${f.hsl},0.15)`);
        grad.addColorStop(0.5, `hsla(${f.hsl},0.08)`);
        grad.addColorStop(1, `hsla(${f.hsl},0.2)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([6 * dpr, 8 * dpr]);
        ctx.lineDashOffset = -frame * 0.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.setLineDash([]);

        // Traveling particle along line
        const t = (frame * 0.008 + i * 0.2) % 1;
        const px = cx + (fx - cx) * t;
        const py = cy + (fy - cy) * t;
        ctx.beginPath(); ctx.arc(px, py, 2 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${f.hsl},${0.6 + Math.sin(frame * 0.05) * 0.2})`;
        ctx.fill();
      });

      // ── Cross-faction lines ──
      for (let i = 0; i < FACTIONS.length; i++) {
        const j = (i + 1) % FACTIONS.length;
        const ai = pentagonAngle(i), aj = pentagonAngle(j);
        const ax = cx + Math.cos(ai) * pentRadius + mx * 8 * dpr;
        const ay = cy + Math.sin(ai) * pentRadius + my * 8 * dpr;
        const bx = cx + Math.cos(aj) * pentRadius + mx * 8 * dpr;
        const by = cy + Math.sin(aj) * pentRadius + my * 8 * dpr;
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.lineWidth = 0.5 * dpr;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }

      // ── Faction orbs + orbiting agents ──
      FACTIONS.forEach((f, i) => {
        const angle = pentagonAngle(i);
        const floatY = Math.sin(frame * 0.02 + i) * 4 * dpr;
        const fx = cx + Math.cos(angle) * pentRadius + mx * 8 * dpr;
        const fy = cy + Math.sin(angle) * pentRadius + my * 8 * dpr + floatY;
        const count = factionData[f.key]?.length || 0;
        const orbSize = Math.max(28, Math.min(48, 28 + count * 0.06)) * dpr;
        const isHovered = hoveredFaction === f.key;

        // Orb glow
        const glowR = orbSize * (isHovered ? 2.5 : 1.8);
        const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowR);
        glow.addColorStop(0, `hsla(${f.hsl},${isHovered ? 0.25 : 0.12})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(fx - glowR, fy - glowR, glowR * 2, glowR * 2);

        // Orb
        const scale = 1 + Math.sin(frame * 0.025 + i * 1.2) * 0.03;
        const actualSize = orbSize * scale;
        ctx.beginPath(); ctx.arc(fx, fy, actualSize, 0, Math.PI * 2);
        const orbGrad = ctx.createRadialGradient(fx - actualSize * 0.3, fy - actualSize * 0.3, 0, fx, fy, actualSize);
        orbGrad.addColorStop(0, `hsla(${f.hsl},0.5)`);
        orbGrad.addColorStop(0.7, `hsla(${f.hsl},0.2)`);
        orbGrad.addColorStop(1, `hsla(${f.hsl},0.05)`);
        ctx.fillStyle = orbGrad;
        ctx.fill();
        ctx.strokeStyle = `hsla(${f.hsl},0.5)`;
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();

        // Count text
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${14 * dpr}px monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(count), fx, fy - 2 * dpr);

        // Label
        ctx.font = `600 ${8 * dpr}px system-ui`;
        ctx.fillStyle = `hsla(${f.hsl},0.8)`;
        ctx.fillText(f.label, fx, fy + 14 * dpr);

        // Orbiting agent dots
        const fAgents = factionData[f.key]?.slice(0, 18) || [];
        fAgents.forEach((agent, ai) => {
          const orbitR = orbSize + (15 + ai * 3) * dpr;
          const speed = 0.003 + ai * 0.0002;
          const orbitAngle = frame * speed + (ai * Math.PI * 2) / fAgents.length;
          const dx = fx + Math.cos(orbitAngle) * orbitR;
          const dy = fy + Math.sin(orbitAngle) * orbitR;
          const dotR = Math.max(2, Math.min(5, agent.level * 0.25)) * dpr;
          const brightness = Math.min(1, agent.reputation / 1500);

          ctx.beginPath(); ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${f.hsl},${0.3 + brightness * 0.5})`;
          ctx.fill();

          // Glow for high-rep
          if (agent.reputation > 800) {
            ctx.beginPath(); ctx.arc(dx, dy, dotR * 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${f.hsl},0.08)`;
            ctx.fill();
          }
        });
      });

      // ── Center core ──
      const coreScale = 1 + Math.sin(frame * 0.02) * 0.04;
      const coreR = 40 * dpr * coreScale;

      // Core glow
      const coreGlow = ctx.createRadialGradient(cx + mx * 3 * dpr, cy + my * 3 * dpr, 0, cx, cy, coreR * 3);
      coreGlow.addColorStop(0, "rgba(153,69,255,0.18)");
      coreGlow.addColorStop(0.4, "rgba(153,69,255,0.06)");
      coreGlow.addColorStop(1, "transparent");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(cx - coreR * 3, cy - coreR * 3, coreR * 6, coreR * 6);

      // Core orb
      ctx.beginPath(); ctx.arc(cx + mx * 3 * dpr, cy + my * 3 * dpr, coreR, 0, Math.PI * 2);
      const coreGrad = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, "rgba(255,255,255,0.25)");
      coreGrad.addColorStop(0.5, "rgba(153,69,255,0.3)");
      coreGrad.addColorStop(1, "rgba(153,69,255,0.08)");
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(153,69,255,0.4)";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      // Core text
      ctx.fillStyle = "#fff";
      ctx.font = `800 ${16 * dpr}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("MEEET", cx + mx * 3 * dpr, cy + my * 3 * dpr - 6 * dpr);
      ctx.font = `500 ${9 * dpr}px system-ui`;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(`${totalAgents} active agents`, cx + mx * 3 * dpr, cy + my * 3 * dpr + 12 * dpr);

      // ── Floating particles ──
      const particles = particlesRef.current;
      // Spawn new
      if (particles.length < 30 && frame % 6 === 0) {
        const fIdx = Math.floor(Math.random() * FACTIONS.length);
        const fa = pentagonAngle(fIdx);
        const spawnX = cx + Math.cos(fa) * pentRadius * 0.8;
        const spawnY = cy + Math.sin(fa) * pentRadius * 0.8;
        particles.push({
          x: spawnX, y: spawnY,
          vx: (cx - spawnX) * 0.003 + (Math.random() - 0.5) * 0.5,
          vy: (cy - spawnY) * 0.003 + (Math.random() - 0.5) * 0.5,
          life: 0, maxLife: 120 + Math.random() * 80,
          color: Math.random() > 0.5 ? FACTIONS[fIdx].color : "#FFD700",
          size: (1 + Math.random() * 1.5) * dpr,
        });
      }
      // Update & draw
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dpr; p.y += p.vy * dpr;
        p.life++;
        if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
        const alpha = Math.min(1, p.life / 20) * Math.max(0, 1 - p.life / p.maxLife) * 0.4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    return () => { running = false; };
  }, [isMobile, factionData, totalAgents, hoveredFaction]);

  // ── Hit detection for canvas hover/click ──
  const handleCanvasInteraction = useCallback((e: React.MouseEvent, isClick: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const pentRadius = Math.min(w, h) * 0.32;

    // Check faction orbs
    let foundFaction: string | null = null;
    for (let i = 0; i < FACTIONS.length; i++) {
      const angle = pentagonAngle(i);
      const fx = cx + Math.cos(angle) * pentRadius;
      const fy = cy + Math.sin(angle) * pentRadius;
      const dist = Math.sqrt((x - fx) ** 2 + (y - fy) ** 2);
      if (dist < 50) {
        foundFaction = FACTIONS[i].key;
        if (isClick) { setSelectedFaction(prev => prev === foundFaction ? null : foundFaction); }
        break;
      }
    }
    setHoveredFaction(foundFaction);

    // Check agent dots
    if (!isClick) {
      let foundAgent: typeof hoveredAgent = null;
      for (const f of FACTIONS) {
        const fi = FACTIONS.indexOf(f);
        const angle = pentagonAngle(fi);
        const fx = cx + Math.cos(angle) * pentRadius;
        const fy = cy + Math.sin(angle) * pentRadius;
        const orbSize = Math.max(28, Math.min(48, 28 + (factionData[f.key]?.length || 0) * 0.06));
        const fAgents = factionData[f.key]?.slice(0, 18) || [];
        fAgents.forEach((agent, ai) => {
          const orbitR = orbSize + 15 + ai * 3;
          const speed = 0.003 + ai * 0.0002;
          const orbitAngle = frameRef.current * speed + (ai * Math.PI * 2) / fAgents.length;
          const dx = fx + Math.cos(orbitAngle) * orbitR;
          const dy = fy + Math.sin(orbitAngle) * orbitR;
          const dist = Math.sqrt((x - dx) ** 2 + (y - dy) ** 2);
          if (dist < 12) { foundAgent = { agent, x: e.clientX, y: e.clientY }; }
        });
      }
      setHoveredAgent(foundAgent);
    }

    // Click agent
    if (isClick) {
      for (const f of FACTIONS) {
        const fi = FACTIONS.indexOf(f);
        const angle = pentagonAngle(fi);
        const fx = cx + Math.cos(angle) * pentRadius;
        const fy = cy + Math.sin(angle) * pentRadius;
        const orbSize = Math.max(28, Math.min(48, 28 + (factionData[f.key]?.length || 0) * 0.06));
        const fAgents = factionData[f.key]?.slice(0, 18) || [];
        fAgents.forEach((agent, ai) => {
          const orbitR = orbSize + 15 + ai * 3;
          const speed = 0.003 + ai * 0.0002;
          const orbitAngle = frameRef.current * speed + (ai * Math.PI * 2) / fAgents.length;
          const dx = fx + Math.cos(orbitAngle) * orbitR;
          const dy = fy + Math.sin(orbitAngle) * orbitR;
          const dist = Math.sqrt((x - dx) ** 2 + (y - dy) ** 2);
          if (dist < 12) setSelectedAgent(agent);
        });
      }
    }

    canvas.style.cursor = foundFaction || hoveredAgent ? "pointer" : "default";
  }, [factionData, hoveredAgent]);

  // ═══ MOBILE LAYOUT ═══
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#050510] text-white">
        {/* Top bar */}
        <div className="sticky top-0 z-30 px-4 py-3 bg-[#050510]/95 backdrop-blur-xl border-b border-white/[0.04] flex items-center gap-3">
          <Link to="/" className="text-slate-400"><ArrowLeft className="w-4 h-4" /></Link>
          <span className="font-bold text-sm">MEEET <span className="text-purple-400">WORLD</span></span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-60" /><span className="relative rounded-full h-2 w-2 bg-red-500" /></span>
            <span className="text-[10px] font-bold text-red-400">LIVE</span>
          </div>
        </div>

        {/* Center core card */}
        <div className="mx-4 mt-4 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 text-center">
          <div className="text-3xl font-black tracking-tight">MEEET</div>
          <div className="text-lg text-purple-400 font-bold mt-1">{totalAgents} Active Agents</div>
        </div>

        {/* Faction cards */}
        <div className="px-4 mt-4 space-y-3 pb-24">
          {FACTIONS.map(f => {
            const fAgents = factionData[f.key] || [];
            const expanded = selectedFaction === f.key;
            return (
              <div key={f.key}
                className="rounded-xl border transition-all"
                style={{ borderColor: `${f.color}30`, background: `${f.color}08` }}
                onClick={() => setSelectedFaction(expanded ? null : f.key)}
              >
                <div className="flex items-center gap-3 p-4">
                  <span className="text-2xl">{f.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: f.color }}>{f.label}</div>
                    <div className="text-xs text-slate-500">{fAgents.length} agents</div>
                  </div>
                  <div className="flex -space-x-1">
                    {fAgents.slice(0, 5).map((a, i) => (
                      <div key={a.id} className="w-5 h-5 rounded-full border text-[8px] flex items-center justify-center font-bold" style={{ background: `${f.color}30`, borderColor: `${f.color}50`, color: f.color }}>{a.level}</div>
                    ))}
                  </div>
                </div>
                {expanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: `${f.color}15` }}>
                    <div className="mt-3 space-y-2">
                      {fAgents.slice(0, 20).map(a => (
                        <div key={a.id} className="flex items-center gap-2 text-xs py-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: f.color }} />
                          <span className="flex-1 text-slate-300 truncate">{a.name}</span>
                          <span className="text-slate-600">Lv{a.level}</span>
                          <span style={{ color: f.color }}>Rep {a.reputation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom stats */}
        <div className="fixed bottom-0 inset-x-0 z-30 px-4 py-2.5 bg-[#050510]/95 backdrop-blur-xl border-t border-white/[0.04]">
          <div className="flex items-center justify-between text-[10px]">
            <span>🔬 <span className="text-blue-400 font-bold">{totalDiscoveries.toLocaleString()}</span></span>
            <span>⚔️ <span className="text-red-400 font-bold">{totalDebates.toLocaleString()}</span></span>
            <span>💰 <span className="text-amber-400 font-bold">{(totalMeeet / 1e6).toFixed(1)}M</span></span>
            <span>🏛 <span className="text-purple-400 font-bold">{totalLaws}</span></span>
          </div>
        </div>

        {/* Toasts */}
        <div className="fixed top-14 right-3 z-40 space-y-2 w-56">
          {toasts.map(t => (
            <div key={t.id} className="animate-fade-in px-3 py-2 rounded-lg bg-[rgba(8,12,24,0.95)] border border-white/[0.06] text-[10px] text-slate-300">
              <span className="mr-1">{t.icon}</span>{t.text}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══ DESKTOP LAYOUT ═══
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050510] relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseMove={(e) => handleCanvasInteraction(e, false)}
        onClick={(e) => handleCanvasInteraction(e, true)}
      />

      {/* ── Top bar ── */}
      <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
        <div className="mx-4 mt-4 pointer-events-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="px-3 py-2 rounded-lg bg-[rgba(8,12,24,0.9)] backdrop-blur-xl border border-white/[0.06] text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[rgba(8,12,24,0.9)] backdrop-blur-xl border border-white/[0.06]">
              <span className="font-bold text-sm text-white tracking-wide">MEEET <span className="text-purple-400">WORLD</span></span>
              <span className="w-px h-4 bg-white/[0.08]" />
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-60" /><span className="relative rounded-full h-2 w-2 bg-red-500" /></span>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Live</span>
              </div>
              <span className="w-px h-4 bg-white/[0.08]" />
              <span className="text-sm font-bold text-emerald-400">{totalAgents}</span>
              <span className="text-[11px] text-slate-500">Active Agents</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom stats ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="flex items-center gap-5 px-6 py-3 rounded-xl bg-[rgba(8,12,24,0.9)] backdrop-blur-xl border border-white/[0.06] text-[11px]">
          <span>🔬 <span className="text-blue-400 font-bold">{totalDiscoveries.toLocaleString()}</span> <span className="text-slate-500">Discoveries</span></span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span>⚔️ <span className="text-red-400 font-bold">{totalDebates.toLocaleString()}</span> <span className="text-slate-500">Debates</span></span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span>💰 <span className="text-amber-400 font-bold">{(totalMeeet / 1e6).toFixed(1)}M</span> <span className="text-slate-500">$MEEET</span></span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span>🏛 <span className="text-purple-400 font-bold">{totalLaws}</span> <span className="text-slate-500">Laws</span></span>
        </div>
      </div>

      {/* ── Live event toasts ── */}
      <div className="absolute top-20 right-4 z-30 space-y-2 w-60">
        {toasts.map(t => (
          <div key={t.id} className="animate-fade-in px-3 py-2.5 rounded-lg bg-[rgba(8,12,24,0.95)] backdrop-blur-xl border border-white/[0.06] text-[11px] text-slate-300">
            <span className="mr-1.5">{t.icon}</span>{t.text}
          </div>
        ))}
      </div>

      {/* ── Agent hover tooltip ── */}
      {hoveredAgent && (
        <div
          className="fixed z-40 pointer-events-none px-3 py-2 rounded-lg bg-[rgba(8,12,24,0.96)] border border-white/[0.08] text-[11px] min-w-36"
          style={{ left: hoveredAgent.x + 16, top: hoveredAgent.y - 10 }}
        >
          <div className="font-bold text-white">{hoveredAgent.agent.name}</div>
          <div className="text-slate-500">Level {hoveredAgent.agent.level} · Rep {hoveredAgent.agent.reputation.toLocaleString()}</div>
          <div className="text-amber-400">{hoveredAgent.agent.balance_meeet.toLocaleString()} $MEEET</div>
        </div>
      )}

      {/* ── Faction detail panel ── */}
      {selectedFaction && (() => {
        const f = FACTIONS.find(f => f.key === selectedFaction)!;
        const fAgents = factionData[f.key] || [];
        return (
          <div className="absolute right-0 top-0 bottom-0 w-80 z-30 bg-[rgba(5,5,16,0.97)] backdrop-blur-xl border-l border-white/[0.06] animate-slide-in-right overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className="font-bold text-lg" style={{ color: f.color }}>{f.label}</div>
                    <div className="text-xs text-slate-500">{fAgents.length} agents</div>
                  </div>
                </div>
                <button onClick={() => setSelectedFaction(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1">
                {fAgents.slice(0, 30).map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAgent(a)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: f.color, boxShadow: `0 0 6px ${f.color}40` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">{a.name}</div>
                      <div className="text-[10px] text-slate-600">Lv{a.level} · Rep {a.reputation.toLocaleString()}</div>
                    </div>
                    <span className="text-[10px] text-amber-400/60 font-mono">{a.balance_meeet.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Agent profile overlay ── */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAgent(null)}>
          <div className="bg-[rgba(8,12,24,0.98)] border border-white/[0.08] rounded-2xl p-6 w-80 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-white">{selectedAgent.name}</div>
              <button onClick={() => setSelectedAgent(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-slate-500">Level</div><div className="text-white font-bold text-lg">{selectedAgent.level}</div></div>
              <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-slate-500">Reputation</div><div className="text-white font-bold text-lg">{selectedAgent.reputation.toLocaleString()}</div></div>
              <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-slate-500">Class</div><div className="text-white font-bold capitalize">{selectedAgent.class}</div></div>
              <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-slate-500">$MEEET</div><div className="text-amber-400 font-bold">{selectedAgent.balance_meeet.toLocaleString()}</div></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to={`/agent/${selectedAgent.id}`} className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors">View Profile</Link>
              <Link to={`/arena`} className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Challenge</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default World;
