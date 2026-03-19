import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";

interface AgentDot {
  x: number; y: number; color: string; rep: number; name: string; cls: string;
}

interface EventDot {
  x: number; y: number; color: string; type: string;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

interface Ripple {
  x: number; y: number; radius: number; maxRadius: number;
  opacity: number; color: string;
}

interface Props {
  agents: AgentDot[];
  events: EventDot[];
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
}

const MAX_PARTICLES = 120;
const MAX_RIPPLES = 20;

const WorldMapCanvas = ({ agents, events, mapRef, mapLoaded }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const ripples = useRef<Ripple[]>([]);
  const frameRef = useRef(0);
  const lastSpawn = useRef(0);

  const spawnParticles = useCallback((dots: AgentDot[]) => {
    const now = Date.now();
    if (now - lastSpawn.current < 200) return;
    lastSpawn.current = now;

    const budget = MAX_PARTICLES - particles.current.length;
    if (budget <= 0) return;

    const count = Math.min(budget, Math.ceil(dots.length / 8));
    for (let i = 0; i < count; i++) {
      const dot = dots[Math.floor(Math.random() * dots.length)];
      if (!dot) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.4;
      particles.current.push({
        x: dot.x + (Math.random() - 0.5) * 10,
        y: dot.y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.2,
        life: 0,
        maxLife: 60 + Math.random() * 80,
        color: dot.color,
        size: 1 + Math.random() * 2,
      });
    }
  }, []);

  const spawnRipple = useCallback((dots: EventDot[]) => {
    if (ripples.current.length >= MAX_RIPPLES) return;
    const dot = dots[Math.floor(Math.random() * dots.length)];
    if (!dot) return;
    ripples.current.push({
      x: dot.x, y: dot.y,
      radius: 4, maxRadius: 30 + Math.random() * 25,
      opacity: 0.5, color: dot.color,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const animate = () => {
      if (!running) return;
      frameRef.current++;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * devicePixelRatio || canvas.height !== h * devicePixelRatio) {
        canvas.width = w * devicePixelRatio;
        canvas.height = h * devicePixelRatio;
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);

      // --- Draw connection lines between nearby agents ---
      if (agents.length > 1 && agents.length < 200) {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < agents.length; i++) {
          for (let j = i + 1; j < Math.min(agents.length, i + 15); j++) {
            const a = agents[i], b = agents[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80 && dist > 5) {
              const alpha = (1 - dist / 80) * 0.12;
              ctx.strokeStyle = `rgba(153,69,255,${alpha})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      // --- Agent glow orbs ---
      const time = frameRef.current * 0.03;
      for (const agent of agents) {
        const pulse = 0.7 + 0.3 * Math.sin(time + agent.x * 0.01);
        const baseSize = 3 + Math.min(agent.rep / 100, 8);
        const glowSize = baseSize * 3 * pulse;

        // Outer glow
        const grad = ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, glowSize);
        grad.addColorStop(0, agent.color + "30");
        grad.addColorStop(0.5, agent.color + "10");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = agent.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, baseSize * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Ring
        ctx.strokeStyle = agent.color + "40";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, baseSize * 1.8 + Math.sin(time * 1.5 + agent.y * 0.02) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- Particles ---
      if (agents.length > 0) spawnParticles(agents);
      particles.current = particles.current.filter(p => {
        p.life++;
        if (p.life >= p.maxLife) return false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.002; // gentle float up
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      // --- Event ripples ---
      if (events.length > 0 && frameRef.current % 40 === 0) spawnRipple(events);
      ripples.current = ripples.current.filter(r => {
        r.radius += 0.5;
        r.opacity -= 0.005;
        if (r.opacity <= 0 || r.radius >= r.maxRadius) return false;
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.opacity;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        return true;
      });

      // --- Scanline effect (subtle) ---
      if (frameRef.current % 3 === 0) {
        const scanY = (frameRef.current * 0.5) % h;
        ctx.strokeStyle = "rgba(153,69,255,0.02)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();
      }

      requestAnimationFrame(animate);
    };

    animate();
    return () => { running = false; };
  }, [agents, events, spawnParticles, spawnRipple]);

  // Re-project on map move
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    const handler = () => {
      // Force re-render by touching state - handled by parent memo recalc
    };
    map.on("move", handler);
    return () => { map.off("move", handler); };
  }, [mapRef, mapLoaded]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
};

export default WorldMapCanvas;
