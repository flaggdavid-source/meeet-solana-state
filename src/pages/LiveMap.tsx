import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Globe, Users, ArrowLeft } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────
interface Agent {
  id: string; name: string; faction: string; level: number; cls: string;
  color: string; deskX: number; deskY: number; x: number; y: number;
  targetX: number; targetY: number;
  state: "working" | "walking" | "meeting" | "returning";
  stateTimer: number; phase: number;
  bubble: string | null; bubbleTimer: number;
  screenGlow: number; // typing activity
}

interface DataPulse {
  fromX: number; fromY: number; toX: number; toY: number;
  progress: number; speed: number; color: string;
}

interface Discovery {
  x: number; y: number; text: string; timer: number; color: string;
}

// ─── Faction config ─────────────────────────────────────────────
const FACTIONS: Record<string, { color: string; bg: string; label: string; icon: string; desc: string }> = {
  BioTech:  { color: "#14F195", bg: "rgba(20,241,149,",  label: "BIOTECH LAB",       icon: "🧬", desc: "Genomics · CRISPR · Pharma" },
  AI:       { color: "#9945FF", bg: "rgba(153,69,255,",  label: "AI DEPARTMENT",      icon: "🤖", desc: "ML · Neural · NLP" },
  Quantum:  { color: "#00D4FF", bg: "rgba(0,212,255,",   label: "QUANTUM WING",       icon: "⚛️", desc: "Qubits · Entanglement · QML" },
  Space:    { color: "#FF6B6B", bg: "rgba(255,107,107,",  label: "SPACE CENTER",       icon: "🚀", desc: "Orbital · Propulsion · Astro" },
  Energy:   { color: "#FFE66D", bg: "rgba(255,230,109,",  label: "ENERGY DIVISION",    icon: "⚡", desc: "Fusion · Solar · Grid" },
};
const FK = Object.keys(FACTIONS);

const BUBBLES_WORK = ["Analyzing data...", "Running simulation...", "Compiling results...", "Optimizing model...", "Testing hypothesis...", "Writing paper..."];
const BUBBLES_SOCIAL = ["Hey, check this!", "Interesting theory!", "Let's collaborate!", "Great findings!", "Peer review?", "Coffee break ☕"];
const BUBBLES_DISCOVERY = ["🔬 EUREKA!", "📜 New paper!", "+25 $MEEET", "+50 $MEEET", "⚡ Breakthrough!", "🧬 Gene mapped!"];

// ─── Layout ─────────────────────────────────────────────────────
const W = 1600, H = 960;
const DESK_W = 40, DESK_H = 24, GAP_X = 54, GAP_Y = 48;

// Pentagon layout around center
const CX = W / 2, CY = H / 2;
const RING_R = 320;

const ZONE_LAYOUT = FK.map((key, i) => {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  const cols = key === "AI" ? 6 : 5;
  const rows = 3;
  const zoneW = cols * GAP_X;
  const zoneH = rows * GAP_Y + 40;
  return {
    key,
    cx: CX + Math.cos(angle) * RING_R,
    cy: CY + Math.sin(angle) * RING_R,
    x: CX + Math.cos(angle) * RING_R - zoneW / 2,
    y: CY + Math.sin(angle) * RING_R - zoneH / 2,
    cols, rows,
    angle,
  };
});

// Hub center
const HUB_R = 70;

// ─── Helpers ────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.min(t, 1); }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getDeskPos(zone: typeof ZONE_LAYOUT[0], idx: number) {
  const col = idx % zone.cols;
  const row = Math.floor(idx / zone.cols);
  return { x: zone.x + col * GAP_X + DESK_W / 2 + 8, y: zone.y + row * GAP_Y + DESK_H / 2 + 38 };
}

// ─── Component ──────────────────────────────────────────────────
const LiveMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<Agent[]>([]);
  const pulsesRef = useRef<DataPulse[]>([]);
  const discovRef = useRef<Discovery[]>([]);
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const [agentCount, setAgentCount] = useState(0);
  const [fCounts, setFCounts] = useState<Record<string, number>>({});
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);

  // ─── Fetch ────────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from("agents")
      .select("id, name, country_code, level, class, status")
      .eq("status", "active")
      .limit(200);
    if (!data?.length) return;

    const counts: Record<string, number> = {};
    const deskIdx: Record<string, number> = {};
    FK.forEach(k => { counts[k] = 0; deskIdx[k] = 0; });

    const mapped: Agent[] = data.map(db => {
      let faction = db.country_code || "";
      if (!FACTIONS[faction]) {
        const c = db.class || "";
        faction = c === "oracle" || c === "trader" ? "AI"
          : c === "warrior" ? "Space"
          : c === "diplomat" ? "BioTech"
          : c === "miner" ? "Quantum" : "Energy";
      }
      counts[faction] = (counts[faction] || 0) + 1;
      const idx = deskIdx[faction] || 0;
      deskIdx[faction] = idx + 1;

      const zone = ZONE_LAYOUT.find(z => z.key === faction) || ZONE_LAYOUT[4];
      const maxD = zone.cols * zone.rows;
      const pos = getDeskPos(zone, idx % maxD);
      const existing = agentsRef.current.find(a => a.id === db.id);

      return {
        id: db.id, name: db.name || `Agent-${db.id.slice(0, 4)}`,
        faction, level: db.level || 1, cls: db.class || "oracle",
        color: FACTIONS[faction]?.color || "#FFE66D",
        deskX: pos.x, deskY: pos.y,
        x: existing?.x ?? pos.x, y: existing?.y ?? pos.y,
        targetX: existing?.targetX ?? pos.x, targetY: existing?.targetY ?? pos.y,
        state: existing?.state ?? "working" as const,
        stateTimer: existing?.stateTimer ?? (200 + Math.random() * 500),
        phase: Math.random() * Math.PI * 2,
        bubble: null, bubbleTimer: 0,
        screenGlow: 0.3 + Math.random() * 0.7,
      };
    });

    agentsRef.current = mapped;
    setAgentCount(mapped.length);
    setFCounts(counts);
  }, []);

  useEffect(() => {
    fetchAgents();
    // Also get discovery count
    supabase.from("discoveries").select("id", { count: "exact", head: true }).then(({ count }) => {
      setTotalDiscoveries(count || 0);
    });
    const iv = setInterval(fetchAgents, 120000);
    return () => clearInterval(iv);
  }, [fetchAgents]);

  // Click
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sy;
      const hit = agentsRef.current.find(a => (a.x - mx) ** 2 + (a.y - my) ** 2 < 225);
      setSelectedAgent(hit || null);
    };
    canvas.addEventListener("click", handle);
    return () => canvas.removeEventListener("click", handle);
  }, []);

  // ─── Render loop ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W; canvas.height = H;
    let running = true;

    const render = (ts: number) => {
      if (!running) return;
      const dt = ts - lastTimeRef.current;
      if (dt < 42) { requestAnimationFrame(render); return; } // ~24fps
      lastTimeRef.current = ts;
      frameRef.current++;
      const t = frameRef.current;
      const agents = agentsRef.current;
      const pulses = pulsesRef.current;
      const discoveries = discovRef.current;

      // ── Background ──
      ctx.fillStyle = "#080c14";
      ctx.fillRect(0, 0, W, H);

      // Subtle hex grid
      ctx.strokeStyle = "rgba(255,255,255,0.015)";
      ctx.lineWidth = 0.5;
      const hexSize = 30;
      for (let hy = -hexSize; hy < H + hexSize; hy += hexSize * 1.5) {
        for (let hx = -hexSize; hx < W + hexSize; hx += hexSize * 1.732) {
          const ox = (Math.floor(hy / (hexSize * 1.5)) % 2) * hexSize * 0.866;
          drawHex(ctx, hx + ox, hy, hexSize * 0.45);
        }
      }

      // ── Data corridors (zone → hub) ──
      ZONE_LAYOUT.forEach(zone => {
        const f = FACTIONS[zone.key];
        const grad = ctx.createLinearGradient(zone.cx, zone.cy, CX, CY);
        grad.addColorStop(0, f.bg + "0.08)");
        grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(zone.cx, zone.cy);
        ctx.lineTo(CX, CY);
        ctx.stroke();

        // Corridor edge lines
        const dx = CX - zone.cx, dy = CY - zone.cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len * 12, ny = dx / len * 12;
        ctx.strokeStyle = f.bg + "0.03)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(zone.cx + nx, zone.cy + ny);
        ctx.lineTo(CX + nx, CY + ny);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(zone.cx - nx, zone.cy - ny);
        ctx.lineTo(CX - nx, CY - ny);
        ctx.stroke();
      });

      // ── Data pulses along corridors ──
      // Spawn new pulses occasionally
      if (t % 40 === 0 && pulses.length < 8) {
        const fromZ = ZONE_LAYOUT[Math.floor(Math.random() * 5)];
        const toZ = Math.random() < 0.5 ? null : ZONE_LAYOUT[Math.floor(Math.random() * 5)];
        pulses.push({
          fromX: fromZ.cx, fromY: fromZ.cy,
          toX: toZ ? toZ.cx : CX, toY: toZ ? toZ.cy : CY,
          progress: 0, speed: 0.008 + Math.random() * 0.006,
          color: FACTIONS[fromZ.key].color,
        });
      }
      // Update & draw pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += p.speed;
        if (p.progress > 1) { pulses.splice(i, 1); continue; }
        const px = lerp(p.fromX, p.toX, p.progress);
        const py = lerp(p.fromY, p.toY, p.progress);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.15;
        ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── Central Hub ──
      // Outer ring
      const hubPulse = 0.6 + Math.sin(t * 0.03) * 0.2;
      ctx.strokeStyle = `rgba(153,69,255,${hubPulse * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(CX, CY, HUB_R + 10, 0, Math.PI * 2); ctx.stroke();

      // Hub background
      const hubGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, HUB_R);
      hubGrad.addColorStop(0, "rgba(20,30,50,0.6)");
      hubGrad.addColorStop(1, "rgba(10,15,25,0.3)");
      ctx.fillStyle = hubGrad;
      ctx.beginPath(); ctx.arc(CX, CY, HUB_R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(153,69,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(CX, CY, HUB_R, 0, Math.PI * 2); ctx.stroke();

      // Hub text
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(153,69,255,0.8)";
      ctx.fillText("NEXUS", CX, CY - 18);
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(`${agentCount} agents online`, CX, CY);
      ctx.fillStyle = "rgba(20,241,149,0.6)";
      ctx.fillText(`${totalDiscoveries} discoveries`, CX, CY + 14);

      // Rotating ring decoration
      const ringAngle = t * 0.008;
      for (let i = 0; i < 6; i++) {
        const a = ringAngle + (i * Math.PI * 2) / 6;
        const rx = CX + Math.cos(a) * (HUB_R + 10);
        const ry = CY + Math.sin(a) * (HUB_R + 10);
        ctx.fillStyle = "rgba(153,69,255,0.4)";
        ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
      }

      // ── Draw Zones ──
      ZONE_LAYOUT.forEach(zone => {
        const f = FACTIONS[zone.key];
        const zw = zone.cols * GAP_X + 20;
        const zh = zone.rows * GAP_Y + 52;

        // Zone panel
        const panelGrad = ctx.createLinearGradient(zone.x, zone.y, zone.x, zone.y + zh);
        panelGrad.addColorStop(0, f.bg + "0.06)");
        panelGrad.addColorStop(1, f.bg + "0.02)");
        ctx.fillStyle = panelGrad;
        roundRect(ctx, zone.x - 6, zone.y - 4, zw, zh, 10);
        ctx.fill();

        // Border with glow
        ctx.strokeStyle = f.bg + "0.2)";
        ctx.lineWidth = 1;
        roundRect(ctx, zone.x - 6, zone.y - 4, zw, zh, 10);
        ctx.stroke();

        // Top accent bar
        ctx.fillStyle = f.bg + "0.25)";
        roundRect(ctx, zone.x - 6, zone.y - 4, zw, 3, 2);
        ctx.fill();

        // Zone header
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = f.color;
        ctx.fillText(`${f.icon}  ${f.label}`, zone.x + 2, zone.y + 14);

        // Subtitle
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillStyle = f.bg + "0.4)";
        ctx.fillText(f.desc, zone.x + 2, zone.y + 26);

        // Agent count badge
        const cnt = fCounts[zone.key] || 0;
        const badgeText = `${cnt}`;
        const bw = ctx.measureText(badgeText).width + 10;
        ctx.fillStyle = f.bg + "0.15)";
        roundRect(ctx, zone.x + zw - bw - 14, zone.y + 4, bw, 16, 4);
        ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = f.color;
        ctx.fillText(badgeText, zone.x + zw - bw / 2 - 14, zone.y + 15);

        // Desks
        for (let r = 0; r < zone.rows; r++) {
          for (let c = 0; c < zone.cols; c++) {
            const dx = zone.x + c * GAP_X + 8;
            const dy = zone.y + r * GAP_Y + 38;

            // Desk surface
            ctx.fillStyle = "rgba(18,25,38,0.9)";
            roundRect(ctx, dx, dy, DESK_W, DESK_H, 3);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.lineWidth = 0.5;
            roundRect(ctx, dx, dy, DESK_W, DESK_H, 3);
            ctx.stroke();

            // Monitor screen
            const monitorActive = Math.sin(t * 0.02 + c * 1.3 + r * 0.7) > -0.3;
            ctx.fillStyle = monitorActive ? f.bg + "0.12)" : "rgba(10,15,20,0.5)";
            ctx.fillRect(dx + DESK_W / 2 - 8, dy + 3, 16, 10);
            if (monitorActive) {
              // Screen scan line
              const scanY = (t * 0.5 + r * 20 + c * 15) % 10;
              ctx.fillStyle = f.bg + "0.06)";
              ctx.fillRect(dx + DESK_W / 2 - 8, dy + 3 + scanY, 16, 1);
            }

            // Chair (tiny circle behind desk)
            ctx.fillStyle = "rgba(30,40,55,0.4)";
            ctx.beginPath();
            ctx.arc(dx + DESK_W / 2, dy + DESK_H + 6, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // ── Update & draw agents ──
      agents.forEach(a => {
        a.stateTimer--;

        if (a.state === "working" && a.stateTimer <= 0) {
          const roll = Math.random();
          if (roll < 0.25) {
            // Visit another zone
            const otherZone = ZONE_LAYOUT[Math.floor(Math.random() * 5)];
            a.state = "walking";
            a.targetX = otherZone.cx + (Math.random() - 0.5) * 60;
            a.targetY = otherZone.cy + (Math.random() - 0.5) * 40;
            a.stateTimer = 250 + Math.random() * 200;
          } else if (roll < 0.45) {
            // Go to hub
            const ha = Math.random() * Math.PI * 2;
            a.state = "walking";
            a.targetX = CX + Math.cos(ha) * (HUB_R - 30);
            a.targetY = CY + Math.sin(ha) * (HUB_R - 30);
            a.stateTimer = 200 + Math.random() * 150;
          } else if (roll < 0.55) {
            // Work bubble
            a.bubble = BUBBLES_WORK[Math.floor(Math.random() * BUBBLES_WORK.length)];
            a.bubbleTimer = 100;
            a.stateTimer = 300 + Math.random() * 400;
          } else if (roll < 0.62) {
            // Discovery!
            const d = BUBBLES_DISCOVERY[Math.floor(Math.random() * BUBBLES_DISCOVERY.length)];
            a.bubble = d;
            a.bubbleTimer = 130;
            a.stateTimer = 400 + Math.random() * 300;
            discoveries.push({ x: a.x, y: a.y - 30, text: d, timer: 90, color: a.color });
          } else {
            a.stateTimer = 150 + Math.random() * 350;
            a.screenGlow = Math.min(1, a.screenGlow + 0.2);
          }
        }

        if (a.state === "walking") {
          a.x = lerp(a.x, a.targetX, 0.025);
          a.y = lerp(a.y, a.targetY, 0.025);
          if ((a.targetX - a.x) ** 2 + (a.targetY - a.y) ** 2 < 9) {
            a.state = "meeting";
            a.stateTimer = 80 + Math.random() * 120;
            a.bubble = BUBBLES_SOCIAL[Math.floor(Math.random() * BUBBLES_SOCIAL.length)];
            a.bubbleTimer = 80;
          }
        }

        if (a.state === "meeting" && a.stateTimer <= 0) {
          a.state = "returning";
          a.targetX = a.deskX; a.targetY = a.deskY;
        }

        if (a.state === "returning") {
          a.x = lerp(a.x, a.targetX, 0.035);
          a.y = lerp(a.y, a.targetY, 0.035);
          if ((a.targetX - a.x) ** 2 + (a.targetY - a.y) ** 2 < 4) {
            a.x = a.deskX; a.y = a.deskY;
            a.state = "working";
            a.stateTimer = 250 + Math.random() * 500;
          }
        }

        if (a.bubbleTimer > 0) { a.bubbleTimer--; if (a.bubbleTimer <= 0) a.bubble = null; }

        // Draw agent
        const isMoving = a.state === "walking" || a.state === "returning";
        const f = FACTIONS[a.faction];

        // Movement trail
        if (isMoving) {
          ctx.fillStyle = f?.bg + "0.05)" || "rgba(255,255,255,0.05)";
          ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, Math.PI * 2); ctx.fill();
        }

        // Agent body
        const sz = isMoving ? 5.5 : 5;
        const glow = 0.5 + Math.sin(t * 0.04 + a.phase) * 0.15;

        // Outer glow ring (working agents pulse)
        if (a.state === "working") {
          ctx.strokeStyle = f?.bg + `${glow * 0.2})` || "rgba(255,255,255,0.1)";
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(a.x, a.y, sz + 3, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.fillStyle = a.color;
        ctx.beginPath(); ctx.arc(a.x, a.y, sz, 0, Math.PI * 2); ctx.fill();

        // Level ring for high-level agents
        if (a.level >= 8) {
          ctx.strokeStyle = "rgba(255,215,0,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(a.x, a.y, sz + 1.5, 0, Math.PI * 2); ctx.stroke();
        }

        // Name label (sitting only)
        if (!isMoving) {
          ctx.font = "7px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,255,255,0.28)";
          ctx.fillText(a.name.length > 9 ? a.name.slice(0, 9) + "…" : a.name, a.x, a.y + 16);
        }

        // Speech bubble
        if (a.bubble && a.bubbleTimer > 0) {
          const fadeIn = Math.min(1, (100 - a.bubbleTimer + 30) / 30);
          const fadeOut = Math.min(1, a.bubbleTimer / 20);
          const alpha = Math.min(fadeIn, fadeOut);

          ctx.globalAlpha = alpha;
          ctx.font = "8px 'JetBrains Mono', monospace";
          const bw = ctx.measureText(a.bubble).width + 14;
          const bx = a.x - bw / 2, by = a.y - 26;

          ctx.fillStyle = "rgba(12,18,30,0.92)";
          roundRect(ctx, bx, by, bw, 18, 5);
          ctx.fill();
          ctx.strokeStyle = f?.bg + "0.35)" || "rgba(255,255,255,0.2)";
          ctx.lineWidth = 0.6;
          roundRect(ctx, bx, by, bw, 18, 5);
          ctx.stroke();

          // Bubble pointer
          ctx.fillStyle = "rgba(12,18,30,0.92)";
          ctx.beginPath();
          ctx.moveTo(a.x - 3, by + 18);
          ctx.lineTo(a.x, by + 22);
          ctx.lineTo(a.x + 3, by + 18);
          ctx.fill();

          ctx.textAlign = "center";
          ctx.fillStyle = a.bubble.includes("$MEEET") ? "#14F195"
            : a.bubble.includes("EUREKA") || a.bubble.includes("Breakthrough") ? "#FFE66D"
            : "rgba(255,255,255,0.8)";
          ctx.fillText(a.bubble, a.x, by + 13);
          ctx.globalAlpha = 1;
        }
      });

      // ── Discovery flashes ──
      for (let i = discoveries.length - 1; i >= 0; i--) {
        const d = discoveries[i];
        d.timer--;
        d.y -= 0.3;
        if (d.timer <= 0) { discoveries.splice(i, 1); continue; }
        const alpha = Math.min(1, d.timer / 30);
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.arc(d.x, d.y + 10, 20 + (90 - d.timer) * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── Bottom status bar ──
      ctx.fillStyle = "rgba(8,12,20,0.85)";
      ctx.fillRect(0, H - 32, W, 32);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, H - 32); ctx.lineTo(W, H - 32); ctx.stroke();

      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText("MEEET INSTITUTE  ·  Real-time Agent Simulation", 12, H - 13);

      // Faction mini-stats in status bar
      let statX = W - 20;
      ctx.textAlign = "right";
      for (let i = FK.length - 1; i >= 0; i--) {
        const k = FK[i];
        const f = FACTIONS[k];
        const cnt = fCounts[k] || 0;
        ctx.fillStyle = f.color;
        ctx.fillText(`${f.icon} ${cnt}`, statX, H - 13);
        statX -= 70;
      }

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
    return () => { running = false; };
  }, [agentCount, fCounts, totalDiscoveries]);

  return (
    <div className="h-screen w-screen bg-[#080c14] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] shrink-0 bg-[#080c14]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Globe className="w-4 h-4 text-primary" />
          <span className="font-mono text-xs font-bold tracking-wider">
            MEEET <span className="text-primary">INSTITUTE</span>
          </span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-semibold">{agentCount}</span>
            <span className="text-[10px] text-muted-foreground">online</span>
          </div>
          {FK.map(k => (
            <div key={k} className="hidden lg:flex items-center gap-1">
              <span className="text-[10px]">{FACTIONS[k].icon}</span>
              <span className="text-[10px] font-mono font-semibold" style={{ color: FACTIONS[k].color }}>
                {fCounts[k] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative min-h-0">
        <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: "auto" }} />

        {selectedAgent && (
          <div
            className="absolute bottom-12 left-4 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 w-64 cursor-pointer shadow-xl"
            onClick={() => setSelectedAgent(null)}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-4 h-4 rounded-full shadow-lg" style={{ background: selectedAgent.color, boxShadow: `0 0 8px ${selectedAgent.color}40` }} />
              <span className="text-sm font-bold">{selectedAgent.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">Lv.{selectedAgent.level}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{FACTIONS[selectedAgent.faction]?.icon} {FACTIONS[selectedAgent.faction]?.label}</span>
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-1 capitalize">
              Status: {selectedAgent.state} · Class: {selectedAgent.cls}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

export default LiveMap;
