import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { X, MessageSquare, Crosshair, ZoomIn, ZoomOut } from "lucide-react";
import PersonalityRadar from "@/components/PersonalityRadar";

/* ─── Types ─── */
interface AgentData {
  id: string; name: string; class: string; level: number;
  reputation: number; balance_meeet: number; status: string;
  country_code: string | null;
  personality_openness: number | null;
  personality_conscientiousness: number | null;
  personality_extraversion: number | null;
  personality_agreeableness: number | null;
  personality_neuroticism: number | null;
}

type CivKey = "ai" | "biotech" | "energy" | "quantum" | "space";
type AnimState = "idle" | "walking" | "working" | "interacting";

interface MapAgent {
  data: AgentData;
  civ: CivKey;
  x: number; y: number;
  targetX: number; targetY: number;
  state: AnimState;
  frame: number;
  stateTimer: number;
  sparkle: number; // countdown for discovery sparkle
  dir: number; // 0=down 1=left 2=right 3=up
}

/* ─── Constants ─── */
const TILE = 16;
const WORLD_W = 80; // tiles
const WORLD_H = 60;
const WORLD_PX_W = WORLD_W * TILE;
const WORLD_PX_H = WORLD_H * TILE;

const CIV_DEFS: Record<CivKey, { label: string; color: string; bgColor: string; accentColor: string; icon: string; region: { x: number; y: number; w: number; h: number } }> = {
  ai:      { label: "AI Core",  color: "#3B82F6", bgColor: "#0a0e1a", accentColor: "#06B6D4", icon: "🤖", region: { x: 25, y: 18, w: 30, h: 24 } },
  biotech: { label: "Biotech",  color: "#22C55E", bgColor: "#0a1a0e", accentColor: "#4ADE80", icon: "🧬", region: { x: 20, y: 0,  w: 40, h: 18 } },
  energy:  { label: "Energy",   color: "#F59E0B", bgColor: "#1a150a", accentColor: "#FBBF24", icon: "⚡", region: { x: 55, y: 18, w: 25, h: 24 } },
  quantum: { label: "Quantum",  color: "#A855F7", bgColor: "#140a1a", accentColor: "#C084FC", icon: "⚛️", region: { x: 20, y: 42, w: 40, h: 18 } },
  space:   { label: "Space",    color: "#EC4899", bgColor: "#1a0a14", accentColor: "#F472B6", icon: "🚀", region: { x: 0,  y: 18, w: 25, h: 24 } },
};

const CLASS_TO_CIV: Record<string, CivKey> = {
  trader: "ai", diplomat: "ai", data_economist: "ai", security_analyst: "ai",
  oracle: "biotech", bio_researcher: "biotech",
  miner: "energy", energy_engineer: "energy",
  warrior: "space", scout: "space", astro_navigator: "space",
  banker: "quantum", quantum_researcher: "quantum",
};

function agentToCiv(a: AgentData): CivKey {
  const cc = (a.country_code || "").toLowerCase();
  if (cc.includes("ai") || cc.includes("core")) return "ai";
  if (cc.includes("bio")) return "biotech";
  if (cc.includes("energ")) return "energy";
  if (cc.includes("space")) return "space";
  if (cc.includes("quantum") || cc.includes("qubit")) return "quantum";
  return CLASS_TO_CIV[a.class] || "ai";
}

/* ─── Pixel Sprite Data (16x16, encoded as rows of color indices) ─── */
const SPRITE_PALETTES: Record<CivKey, string[]> = {
  ai:      ["transparent", "#3B82F6", "#1E3A5F", "#06B6D4", "#FFFFFF", "#0a0e1a"],
  biotech: ["transparent", "#22C55E", "#166534", "#4ADE80", "#FFFFFF", "#0a1a0e"],
  energy:  ["transparent", "#F59E0B", "#92400E", "#FBBF24", "#FFFFFF", "#1a150a"],
  quantum: ["transparent", "#A855F7", "#581C87", "#C084FC", "#FFFFFF", "#140a1a"],
  space:   ["transparent", "#EC4899", "#9D174D", "#F472B6", "#FFFFFF", "#1a0a14"],
};

// Simple 16x16 sprite: head (row 3-6), body (7-12), legs (13-15)
function drawSprite(ctx: CanvasRenderingContext2D, x: number, y: number, civ: CivKey, state: AnimState, frame: number, scale: number) {
  const pal = SPRITE_PALETTES[civ];
  const s = scale;
  const px = (ox: number, oy: number, ci: number) => {
    if (ci === 0) return;
    ctx.fillStyle = pal[ci];
    ctx.fillRect(x + ox * s, y + oy * s, s, s);
  };

  // Head
  for (let dx = 5; dx <= 10; dx++) { px(dx, 3, 4); px(dx, 4, 4); }
  px(6, 5, 5); px(9, 5, 5); // eyes
  for (let dx = 5; dx <= 10; dx++) px(dx, 5, 4);
  for (let dx = 5; dx <= 10; dx++) px(dx, 6, 4);

  // Body
  const bodyColor = state === "working" ? 3 : 1;
  for (let dy = 7; dy <= 11; dy++) {
    for (let dx = 5; dx <= 10; dx++) px(dx, dy, bodyColor);
  }
  // Arms
  const armOff = state === "interacting" ? (frame % 2 === 0 ? -1 : 0) : 0;
  px(4, 8 + armOff, 2); px(4, 9 + armOff, 2);
  px(11, 8 - armOff, 2); px(11, 9 - armOff, 2);

  // Belt / accent
  for (let dx = 5; dx <= 10; dx++) px(dx, 10, 2);

  // Legs
  const legOff = state === "walking" ? (frame % 2 === 0 ? 1 : 0) : 0;
  px(6, 12, 2); px(7, 12, 2);
  px(6, 13 + legOff, 2); px(7, 13 + legOff, 2);
  px(9, 12, 2); px(10, 12, 2);
  px(9, 13 - legOff, 2); px(10, 13 - legOff, 2);

  // Civ-specific flair
  if (civ === "ai") { px(7, 3, 3); px(8, 3, 3); } // antenna
  if (civ === "biotech") { px(11, 7, 3); px(12, 7, 3); px(12, 8, 3); } // flask
  if (civ === "energy") { px(7, 2, 3); px(8, 2, 3); } // hard hat
  if (civ === "quantum") { px(4, 7, 3); px(3, 8, 3); } // crystal
  if (civ === "space") { for (let dx = 4; dx <= 11; dx++) px(dx, 3, 4); px(4, 4, 4); px(11, 4, 4); } // helmet
}

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, scale: number) {
  const alpha = Math.max(0, 1 - t / 60);
  const size = (4 + t * 0.3) * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 1.5 * scale;
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + t * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * size * 0.3, cy + Math.sin(angle) * size * 0.3);
    ctx.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const bx = x - 4 * scale, by = y - 6 * scale, bw = 12 * scale, bh = 6 * scale;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 2 * scale);
  ctx.fill();
  // dots
  ctx.fillStyle = "#333";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(bx + (3 + i * 3) * scale, by + 3 * scale, 0.8 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Terrain Drawing ─── */
function drawTerrain(ctx: CanvasRenderingContext2D, viewX: number, viewY: number, viewW: number, viewH: number, scale: number, frameCount: number) {
  const ts = TILE * scale;
  const startTX = Math.max(0, Math.floor(viewX / TILE));
  const startTY = Math.max(0, Math.floor(viewY / TILE));
  const endTX = Math.min(WORLD_W, Math.ceil((viewX + viewW / scale) / TILE) + 1);
  const endTY = Math.min(WORLD_H, Math.ceil((viewY + viewH / scale) / TILE) + 1);

  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const sx = (tx * TILE - viewX) * scale;
      const sy = (ty * TILE - viewY) * scale;
      const civ = getTileCiv(tx, ty);
      const def = CIV_DEFS[civ];

      // Base tile
      ctx.fillStyle = def.bgColor;
      ctx.fillRect(sx, sy, ts + 1, ts + 1);

      // Grid lines
      ctx.strokeStyle = `${def.color}15`;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, ts, ts);

      // Decoration patterns
      const hash = (tx * 7919 + ty * 104729) % 100;
      if (hash < 8) {
        // Structure
        ctx.fillStyle = `${def.color}30`;
        ctx.fillRect(sx + 2 * scale, sy + 2 * scale, ts - 4 * scale, ts - 4 * scale);
        ctx.strokeStyle = `${def.color}50`;
        ctx.lineWidth = scale;
        ctx.strokeRect(sx + 2 * scale, sy + 2 * scale, ts - 4 * scale, ts - 4 * scale);
      } else if (hash < 15) {
        // Small detail
        ctx.fillStyle = `${def.accentColor}20`;
        ctx.beginPath();
        ctx.arc(sx + ts / 2, sy + ts / 2, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // Civ-specific animated details
      if (civ === "ai" && hash < 4) {
        // Circuitry line
        const pulse = Math.sin(frameCount * 0.03 + tx * 0.5) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(6,182,212,${0.1 + pulse * 0.2})`;
        ctx.lineWidth = scale;
        ctx.beginPath();
        ctx.moveTo(sx, sy + ts / 2);
        ctx.lineTo(sx + ts, sy + ts / 2);
        ctx.stroke();
      }
      if (civ === "biotech" && hash >= 15 && hash < 20) {
        // Organic blob
        ctx.fillStyle = `${def.accentColor}15`;
        ctx.beginPath();
        ctx.ellipse(sx + ts / 2, sy + ts / 2, 5 * scale, 3 * scale, (tx + ty) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (civ === "energy" && hash < 3) {
        // Lightning flash
        const flash = Math.sin(frameCount * 0.08 + tx) > 0.8;
        if (flash) {
          ctx.strokeStyle = `${def.accentColor}60`;
          ctx.lineWidth = scale;
          ctx.beginPath();
          ctx.moveTo(sx + ts * 0.3, sy);
          ctx.lineTo(sx + ts * 0.6, sy + ts * 0.5);
          ctx.lineTo(sx + ts * 0.4, sy + ts * 0.5);
          ctx.lineTo(sx + ts * 0.7, sy + ts);
          ctx.stroke();
        }
      }
      if (civ === "quantum" && hash < 5) {
        // Crystal
        const glow = Math.sin(frameCount * 0.02 + tx * ty) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(168,85,247,${0.1 + glow * 0.15})`;
        ctx.beginPath();
        ctx.moveTo(sx + ts / 2, sy + 1 * scale);
        ctx.lineTo(sx + ts - 2 * scale, sy + ts / 2);
        ctx.lineTo(sx + ts / 2, sy + ts - 1 * scale);
        ctx.lineTo(sx + 2 * scale, sy + ts / 2);
        ctx.closePath();
        ctx.fill();
      }
      if (civ === "space" && hash < 3) {
        // Star twinkle
        const tw = Math.sin(frameCount * 0.05 + hash) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255,255,255,${0.1 + tw * 0.3})`;
        ctx.beginPath();
        ctx.arc(sx + ts * 0.3 + hash, sy + ts * 0.4, (1 + tw) * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Territory borders
  for (const [, def] of Object.entries(CIV_DEFS)) {
    const r = def.region;
    const bx = (r.x * TILE - viewX) * scale;
    const by = (r.y * TILE - viewY) * scale;
    const bw = r.w * TILE * scale;
    const bh = r.h * TILE * scale;
    ctx.strokeStyle = `${def.color}25`;
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([6 * scale, 4 * scale]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.setLineDash([]);
  }
}

function getTileCiv(tx: number, ty: number): CivKey {
  for (const [key, def] of Object.entries(CIV_DEFS) as [CivKey, typeof CIV_DEFS[CivKey]][]) {
    const r = def.region;
    if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return key;
  }
  return "ai";
}

/* ─── Main Component ─── */
export default function PixelWorldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<MapAgent[]>([]);
  const viewRef = useRef({ x: WORLD_PX_W / 2 - 400, y: WORLD_PX_H / 2 - 300, zoom: 2 });
  const dragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({ dragging: false, lastX: 0, lastY: 0 });
  const frameRef = useRef(0);

  const [selectedAgent, setSelectedAgent] = useState<MapAgent | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<{ agent: MapAgent; screenX: number; screenY: number } | null>(null);

  // Fetch agents
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("agents_public")
        .select("id, name, class, level, reputation, balance_meeet, status, country_code")
        .eq("status", "active")
        .order("reputation", { ascending: false })
        .limit(200);
      if (!data) return;

      const mapped: MapAgent[] = (data as unknown as AgentData[]).map((a) => {
        const civ = agentToCiv(a);
        const r = CIV_DEFS[civ].region;
        const px = (r.x + 2 + Math.random() * (r.w - 4)) * TILE;
        const py = (r.y + 2 + Math.random() * (r.h - 4)) * TILE;
        return {
          data: a, civ, x: px, y: py, targetX: px, targetY: py,
          state: "idle" as AnimState, frame: 0, stateTimer: 60 + Math.random() * 120,
          sparkle: 0, dir: 0,
        };
      });
      agentsRef.current = mapped;
    };
    fetch();
  }, []);

  // Real-time discovery sparkle
  useRealtimeSubscription({
    table: "discoveries",
    event: "INSERT",
    onInsert: () => {
      const agents = agentsRef.current;
      if (agents.length > 0) {
        const idx = Math.floor(Math.random() * agents.length);
        agents[idx].sparkle = 60;
      }
    },
  });

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let running = true;

    const loop = () => {
      if (!running) return;
      frameRef.current++;
      const fc = frameRef.current;

      // Resize canvas
      const container = containerRef.current;
      if (container) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
          canvas.width = cw * dpr;
          canvas.height = ch * dpr;
          canvas.style.width = cw + "px";
          canvas.style.height = ch + "px";
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const v = viewRef.current;
      const z = v.zoom;

      // Clear
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, cw, ch);

      // Draw terrain
      drawTerrain(ctx, v.x, v.y, cw, ch, z, fc);

      // Update & draw agents
      const agents = agentsRef.current;
      for (const ag of agents) {
        // State machine
        ag.stateTimer--;
        if (ag.stateTimer <= 0) {
          const states: AnimState[] = ["idle", "walking", "working", "interacting"];
          ag.state = states[Math.floor(Math.random() * states.length)];
          ag.stateTimer = 60 + Math.random() * 180;
          if (ag.state === "walking") {
            const r = CIV_DEFS[ag.civ].region;
            ag.targetX = (r.x + 2 + Math.random() * (r.w - 4)) * TILE;
            ag.targetY = (r.y + 2 + Math.random() * (r.h - 4)) * TILE;
          }
        }

        // Movement
        if (ag.state === "walking") {
          const dx = ag.targetX - ag.x;
          const dy = ag.targetY - ag.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 1) {
            const speed = 0.3;
            ag.x += (dx / dist) * speed;
            ag.y += (dy / dist) * speed;
            ag.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
          } else {
            ag.state = "idle";
          }
        }

        ag.frame = fc;
        if (ag.sparkle > 0) ag.sparkle--;

        // Screen position
        const sx = (ag.x - v.x) * z;
        const sy = (ag.y - v.y) * z;

        // Culling
        if (sx < -20 * z || sx > cw + 20 * z || sy < -20 * z || sy > ch + 20 * z) continue;

        // Draw sprite
        const spriteScale = z;
        drawSprite(ctx, sx, sy, ag.civ, ag.state, Math.floor(fc / 15), spriteScale);

        // Sparkle
        if (ag.sparkle > 0) {
          drawSparkle(ctx, sx + 8 * z, sy, 60 - ag.sparkle, z);
        }

        // Speech bubble for interacting
        if (ag.state === "interacting") {
          drawBubble(ctx, sx + 8 * z, sy, z);
        }
      }

      // Territory labels
      for (const [key, def] of Object.entries(CIV_DEFS)) {
        const r = def.region;
        const lx = ((r.x + r.w / 2) * TILE - v.x) * z;
        const ly = ((r.y + 1.5) * TILE - v.y) * z;
        if (lx < -200 || lx > cw + 200 || ly < -50 || ly > ch + 50) continue;
        ctx.font = `bold ${Math.max(10, 12 * z)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = `${def.color}90`;
        ctx.fillText(`${def.icon} ${def.label.toUpperCase()}`, lx, ly);
        // Agent count
        const count = agents.filter(a => a.civ === key).length;
        ctx.font = `${Math.max(8, 9 * z)}px monospace`;
        ctx.fillStyle = `${def.color}50`;
        ctx.fillText(`${count} agents`, lx, ly + 14 * z);
      }

      // Mini-map
      const mmW = 120, mmH = 90;
      const mmX = cw - mmW - 10, mmY = ch - mmH - 10;
      ctx.fillStyle = "rgba(5,5,16,0.8)";
      ctx.fillRect(mmX, mmY, mmW, mmH);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mmX, mmY, mmW, mmH);

      const mmSx = mmW / WORLD_PX_W;
      const mmSy = mmH / WORLD_PX_H;
      for (const [, def] of Object.entries(CIV_DEFS)) {
        const r = def.region;
        ctx.fillStyle = `${def.color}30`;
        ctx.fillRect(mmX + r.x * TILE * mmSx, mmY + r.y * TILE * mmSy, r.w * TILE * mmSx, r.h * TILE * mmSy);
      }
      // Viewport indicator
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        mmX + v.x * mmSx,
        mmY + v.y * mmSy,
        (cw / z) * mmSx,
        (ch / z) * mmSy
      );
      // Agent dots on minimap
      for (const ag of agents) {
        ctx.fillStyle = CIV_DEFS[ag.civ].color;
        ctx.fillRect(mmX + ag.x * mmSx - 0.5, mmY + ag.y * mmSy - 0.5, 1.5, 1.5);
      }

      requestAnimationFrame(loop);
    };

    loop();
    return () => { running = false; };
  }, []);

  // Mouse / touch handlers
  const getWorldPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { wx: 0, wy: 0 };
    const rect = canvas.getBoundingClientRect();
    const v = viewRef.current;
    const wx = (clientX - rect.left) / v.zoom + v.x;
    const wy = (clientY - rect.top) / v.zoom + v.y;
    return { wx, wy };
  }, []);

  const findAgentAt = useCallback((wx: number, wy: number): MapAgent | null => {
    for (const ag of agentsRef.current) {
      const dx = wx - (ag.x + 8);
      const dy = wy - (ag.y + 8);
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return ag;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d.dragging) {
      const v = viewRef.current;
      v.x -= (e.clientX - d.lastX) / v.zoom;
      v.y -= (e.clientY - d.lastY) / v.zoom;
      // Clamp
      v.x = Math.max(-100, Math.min(WORLD_PX_W - 100, v.x));
      v.y = Math.max(-100, Math.min(WORLD_PX_H - 100, v.y));
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      setHoveredAgent(null);
    } else {
      const { wx, wy } = getWorldPos(e.clientX, e.clientY);
      const ag = findAgentAt(wx, wy);
      if (ag) {
        const rect = canvasRef.current!.getBoundingClientRect();
        setHoveredAgent({ agent: ag, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top });
      } else {
        setHoveredAgent(null);
      }
    }
  }, [getWorldPos, findAgentAt]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    const moved = Math.abs(e.clientX - d.lastX) + Math.abs(e.clientY - d.lastY);
    d.dragging = false;

    if (moved < 5) {
      // Click
      const { wx, wy } = getWorldPos(e.clientX, e.clientY);
      const ag = findAgentAt(wx, wy);
      if (ag) {
        setSelectedAgent(ag);
        setHoveredAgent(null);
      } else {
        setSelectedAgent(null);
      }
    }
  }, [getWorldPos, findAgentAt]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const v = viewRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wxBefore = mx / v.zoom + v.x;
    const wyBefore = my / v.zoom + v.y;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    v.zoom = Math.max(0.5, Math.min(6, v.zoom * delta));

    v.x = wxBefore - mx / v.zoom;
    v.y = wyBefore - my / v.zoom;
  }, []);

  const zoomTo = useCallback((factor: number) => {
    const v = viewRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const wxBefore = cx / v.zoom + v.x;
    const wyBefore = cy / v.zoom + v.y;
    v.zoom = Math.max(0.5, Math.min(6, v.zoom * factor));
    v.x = wxBefore - cx / v.zoom;
    v.y = wyBefore - cy / v.zoom;
  }, []);

  const centerOnCiv = useCallback((civ: CivKey) => {
    const r = CIV_DEFS[civ].region;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const v = viewRef.current;
    v.zoom = 3;
    v.x = (r.x + r.w / 2) * TILE - canvas.clientWidth / (2 * v.zoom);
    v.y = (r.y + r.h / 2) * TILE - canvas.clientHeight / (2 * v.zoom);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#050510]">
      <canvas
        ref={canvasRef}
        className="block cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        <button onClick={() => zoomTo(1.3)} className="w-9 h-9 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => zoomTo(0.7)} className="w-9 h-9 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => { viewRef.current = { x: WORLD_PX_W / 2 - 400, y: WORLD_PX_H / 2 - 300, zoom: 2 }; }} className="w-9 h-9 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors">
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Civilization quick-nav */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-20">
        {(Object.entries(CIV_DEFS) as [CivKey, typeof CIV_DEFS[CivKey]][]).map(([key, def]) => (
          <button
            key={key}
            onClick={() => centerOnCiv(key)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs font-mono hover:border-white/30 transition-colors"
            style={{ color: def.color }}
          >
            <span>{def.icon}</span>
            <span className="hidden sm:inline">{def.label}</span>
          </button>
        ))}
      </div>

      {/* Hover tooltip */}
      {hoveredAgent && !selectedAgent && (
        <div
          className="absolute z-30 pointer-events-none px-3 py-1.5 rounded-lg bg-black/90 border border-white/10 text-xs text-white font-mono"
          style={{ left: hoveredAgent.screenX + 16, top: hoveredAgent.screenY - 10 }}
        >
          {hoveredAgent.agent.data.name}
          <span className="text-muted-foreground ml-2">Lv{hoveredAgent.agent.data.level}</span>
        </div>
      )}

      {/* Selected agent panel */}
      {selectedAgent && (
        <div className="absolute top-4 right-16 w-72 z-30 rounded-xl bg-black/90 border border-white/10 backdrop-blur-sm p-4 animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-sm text-white">{selectedAgent.data.name}</div>
              <div className="text-xs font-mono" style={{ color: CIV_DEFS[selectedAgent.civ].color }}>
                {CIV_DEFS[selectedAgent.civ].icon} {CIV_DEFS[selectedAgent.civ].label}
              </div>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/40">Level</div>
              <div className="text-white font-bold">{selectedAgent.data.level}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/40">Reputation</div>
              <div className="text-white font-bold">{selectedAgent.data.reputation.toLocaleString()}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/40">Class</div>
              <div className="text-white font-bold capitalize">{selectedAgent.data.class}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/40">$MEEET</div>
              <div className="text-amber-400 font-bold">{selectedAgent.data.balance_meeet.toLocaleString()}</div>
            </div>
          </div>

          {/* Personality radar */}
          {selectedAgent.data.personality_openness != null && (
            <div className="flex justify-center mb-3">
              <PersonalityRadar
                openness={selectedAgent.data.personality_openness || 0.5}
                conscientiousness={selectedAgent.data.personality_conscientiousness || 0.5}
                extraversion={selectedAgent.data.personality_extraversion || 0.5}
                agreeableness={selectedAgent.data.personality_agreeableness || 0.5}
                neuroticism={selectedAgent.data.personality_neuroticism || 0.5}
                size={120}
                accentColor={CIV_DEFS[selectedAgent.civ].color}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Link to={`/chat`} className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
              <MessageSquare className="w-3 h-3" /> Chat
            </Link>
            <Link to={`/agents/${selectedAgent.data.id}`} className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors">
              Passport
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
