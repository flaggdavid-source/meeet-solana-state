import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Network, CircleDot, Link2 } from "lucide-react";

const DOMAINS = [
  { name: "Economics", color: "hsl(142, 71%, 45%)" },
  { name: "Security", color: "hsl(0, 72%, 51%)" },
  { name: "Finance", color: "hsl(48, 96%, 53%)" },
  { name: "Quantum", color: "hsl(217, 91%, 60%)" },
  { name: "Physics", color: "hsl(271, 81%, 56%)" },
  { name: "Policy", color: "hsl(25, 95%, 53%)" },
];

interface Node {
  x: number;
  y: number;
  r: number;
  domain: number;
  vx: number;
  vy: number;
  phase: number;
}

const STATS = [
  { label: "Entities", value: "1,247", icon: CircleDot },
  { label: "Relations", value: "3,891", icon: Link2 },
  { label: "Domains", value: "6", icon: Network },
];

const KnowledgeGraphExplorer = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes] = useState<Node[]>(() => {
    const arr: Node[] = [];
    for (let i = 0; i < 30; i++) {
      arr.push({
        x: 60 + Math.random() * 680,
        y: 40 + Math.random() * 320,
        r: 5 + Math.random() * 8,
        domain: Math.floor(Math.random() * 6),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  });

  const [edges] = useState(() => {
    const e: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      const connections = 1 + Math.floor(Math.random() * 2);
      for (let c = 0; c < connections; c++) {
        const j = (i + 1 + Math.floor(Math.random() * (nodes.length - 1))) % nodes.length;
        e.push([i, j]);
      }
    }
    return e;
  });

  const [positions, setPositions] = useState(nodes.map((n) => ({ x: n.x, y: n.y })));
  const frameRef = useRef<number>(0);

  useEffect(() => {
    let t = 0;
    const animate = () => {
      t += 0.01;
      setPositions(
        nodes.map((n) => ({
          x: n.x + Math.sin(t * 2 + n.phase) * 8,
          y: n.y + Math.cos(t * 1.5 + n.phase) * 6,
        }))
      );
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [nodes]);

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-display font-black">Knowledge Graph Explorer</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {DOMAINS.map((d) => (
            <Badge key={d.name} variant="outline" className="text-[10px] gap-1.5" style={{ borderColor: d.color + "60", color: d.color }}>
              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              {d.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 800 400"
          className="w-full h-auto"
          style={{ minHeight: 280 }}
        >
          <defs>
            {DOMAINS.map((d, i) => (
              <radialGradient key={i} id={`glow-${i}`}>
                <stop offset="0%" stopColor={d.color} stopOpacity="0.6" />
                <stop offset="100%" stopColor={d.color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          {/* Edges */}
          {edges.map(([a, b], i) => (
            <line
              key={`e-${i}`}
              x1={positions[a].x}
              y1={positions[a].y}
              x2={positions[b].x}
              y2={positions[b].y}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              strokeOpacity="0.4"
            />
          ))}

          {/* Nodes */}
          {nodes.map((n, i) => (
            <g key={i}>
              <circle
                cx={positions[i].x}
                cy={positions[i].y}
                r={n.r * 3}
                fill={`url(#glow-${n.domain})`}
              />
              <circle
                cx={positions[i].x}
                cy={positions[i].y}
                r={n.r}
                fill={DOMAINS[n.domain].color}
                fillOpacity="0.9"
                stroke={DOMAINS[n.domain].color}
                strokeWidth="1"
                strokeOpacity="0.4"
              >
                <animate
                  attributeName="r"
                  values={`${n.r};${n.r + 1.5};${n.r}`}
                  dur={`${2 + Math.random()}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </svg>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/50 bg-card/40 p-3 text-center">
            <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-display font-black tabular-nums">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default KnowledgeGraphExplorer;
