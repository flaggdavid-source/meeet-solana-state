import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/runtime-client";
import WorldMapCanvas from "./WorldMapCanvas";
import WorldMapTopBar from "./world/WorldMapTopBar";
import WorldMapLeftSidebar from "./world/WorldMapLeftSidebar";
import WorldMapRightPanel from "./world/WorldMapRightPanel";
import WorldMapFilterBar from "./world/WorldMapFilterBar";
import WorldMapNotifications from "./world/WorldMapNotifications";

// ── Class colors per spec ──
const CLASS_COLORS: Record<string, string> = {
  diplomat: "#4ECDC4",
  oracle: "#FFE66D",
  trader: "#FF6B6B",
  warrior: "#A8E6CF",
  miner: "#B8A9FF",
  banker: "#FFA07A",
  president: "#FFD700",
  builder: "#87CEEB",
  hacker: "#FF69B4",
  scout: "#98FB98",
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️", trader: "💰", scout: "🔭", diplomat: "🤝",
  builder: "🏗️", hacker: "💻", president: "👑", oracle: "🔮",
  miner: "⛏️", banker: "🏦",
};

export const EVENT_TYPES = [
  { key: "conflict", label: "Conflicts", color: "#ff3333", icon: "⚔️" },
  { key: "disaster", label: "Disasters", color: "#ff8800", icon: "🌋" },
  { key: "discovery", label: "Discoveries", color: "#33aaff", icon: "🔬" },
  { key: "diplomacy", label: "Diplomacy", color: "#33ff88", icon: "🕊️" },
  { key: "geopolitical", label: "Geopolitical", color: "#a78bfa", icon: "🌍" },
];

export interface Agent {
  id: string; name: string; class: string;
  lat: number | null; lng: number | null;
  reputation: number; balance_meeet: number;
  level: number; status: string; nation_code: string | null;
}

export interface WorldEvent {
  id: string; event_type: string; title: string;
  lat: number | null; lng: number | null;
  nation_codes: any; goldstein_scale: number | null; created_at: string;
}

interface MyAgent {
  id: string; name: string; class: string; level: number;
  reputation: number; balance_meeet: number;
  territories_held: number; status: string;
  lat: number | null; lng: number | null;
}

interface WorldMapProps {
  height?: string; interactive?: boolean; showSidebar?: boolean;
  onEventClick?: (event: WorldEvent) => void;
  myAgent?: MyAgent;
}

// ── Dark geopolitical style ──
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; CARTO",
    },
    "carto-labels": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
    },
    "country-borders": {
      type: "geojson",
      data: "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
    },
  },
  layers: [
    {
      id: "base", type: "raster", source: "carto-dark",
      paint: {
        "raster-brightness-max": 0.28,
        "raster-brightness-min": 0.02,
        "raster-contrast": 0.35,
        "raster-saturation": -0.8,
      },
    },
    {
      id: "country-fill", type: "fill", source: "country-borders",
      paint: {
        "fill-color": "#0E1525",
        "fill-opacity": 0.6,
      },
    },
    {
      id: "country-borders-line", type: "line", source: "country-borders",
      paint: {
        "line-color": "#1E2D4A",
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 3, 1, 6, 1.8],
      },
    },
    {
      id: "country-borders-glow", type: "line", source: "country-borders",
      paint: {
        "line-color": "rgba(30, 45, 74, 0.4)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 2, 6, 5],
        "line-blur": 4,
      },
    },
    {
      id: "labels", type: "raster", source: "carto-labels",
      minzoom: 3,
      paint: {
        "raster-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0, 4.5, 0.5, 6, 0.7],
        "raster-brightness-max": 0.4,
        "raster-saturation": -0.6,
      },
    },
  ],
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
};

// ── Marker CSS ──
const MARKER_CSS = `
@keyframes wm-glow-pulse {
  0%, 100% { box-shadow: 0 0 8px 3px var(--glow-color), 0 0 20px 6px var(--glow-color-dim); transform: scale(1); }
  50% { box-shadow: 0 0 14px 5px var(--glow-color), 0 0 30px 10px var(--glow-color-dim); transform: scale(1.08); }
}
@keyframes wm-glow-pulse-strong {
  0%, 100% { box-shadow: 0 0 12px 5px var(--glow-color), 0 0 30px 10px var(--glow-color-dim); transform: scale(1); }
  50% { box-shadow: 0 0 20px 8px var(--glow-color), 0 0 40px 16px var(--glow-color-dim); transform: scale(1.06); }
}
.wm-agent-marker {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  cursor: pointer; z-index: 10; position: relative;
}
.wm-agent-circle {
  width: 32px; height: 32px; border-radius: 50%;
  border: 2px solid var(--border-color);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; background: rgba(8,12,20,0.8);
  animation: wm-glow-pulse 3s ease-in-out infinite;
  transition: transform 0.2s;
}
.wm-agent-circle:hover { transform: scale(1.2) !important; z-index: 20; }
.wm-agent-circle.wm-top {
  width: 44px; height: 44px; font-size: 20px;
  border-width: 2.5px;
  animation: wm-glow-pulse-strong 3s ease-in-out infinite;
}
.wm-agent-circle.wm-offline {
  animation: none;
  opacity: 0.5;
}
.wm-agent-name {
  font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
  color: #fff; white-space: nowrap; pointer-events: none;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5);
}
.wm-warning-pulse {
  width: 16px; height: 16px; border-radius: 50%;
  background: #ef4444; border: 2px solid #fca5a5;
  box-shadow: 0 0 12px 4px rgba(239,68,68,0.5);
  cursor: pointer; position: relative;
}
@keyframes wm-ripple {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(3); opacity: 0; }
}
.wm-ripple {
  position: absolute; inset: -4px; border-radius: 50%;
  border: 2px solid var(--glow-color);
  animation: wm-ripple 2s ease-out forwards;
  pointer-events: none;
}
.maplibregl-popup-content {
  background: rgba(10,14,26,0.95) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 12px !important; padding: 14px !important;
  color: #e2e8f0 !important; font-size: 13px !important;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6) !important;
}
.maplibregl-popup-tip { border-top-color: rgba(10,14,26,0.95) !important; }
.maplibregl-popup-close-button { color: #94a3b8 !important; font-size: 18px !important; }
.maplibregl-ctrl-attrib { display: none !important; }
.maplibregl-ctrl-group {
  background: rgba(10,14,26,0.8) !important; backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255,255,255,0.06) !important; border-radius: 8px !important;
}
.maplibregl-ctrl-group button { background: transparent !important; }
`;

export { CLASS_COLORS, CLASS_ICONS };

const WorldMap = ({ height = "100vh", interactive = true, showSidebar = false, onEventClick, myAgent }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const agentMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Inject CSS
  useEffect(() => {
    const id = "wm-v2-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = MARKER_CSS;
    document.head.appendChild(style);
  }, []);

  // Top 10 agent IDs for larger markers
  const top10Ids = useMemo(() => {
    const sorted = [...agents].sort((a, b) => (b.reputation + b.balance_meeet) - (a.reputation + a.balance_meeet));
    return new Set(sorted.slice(0, 10).map(a => a.id));
  }, [agents]);

  // Filtered agents for display
  const visibleAgents = useMemo(() => {
    return agents.filter(a => {
      if (!a.lat || !a.lng) return false;
      if (activeFilter === "all") return true;
      if (activeFilter === "allies") return false; // TODO: alliance data
      return a.class === activeFilter;
    });
  }, [agents, activeFilter]);

  // Agents that should fade
  const fadedIds = useMemo(() => {
    if (activeFilter === "all") return new Set<string>();
    return new Set(agents.filter(a => a.lat && a.lng && a.class !== activeFilter).map(a => a.id));
  }, [agents, activeFilter]);

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from("agents_public")
      .select("id, name, class, lat, lng, reputation, balance_meeet, level, status, nation_code")
      .not("lat", "is", null).not("lng", "is", null).limit(500);
    if (data) setAgents(data as Agent[]);
  }, []);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("world_events").select("*")
      .order("created_at", { ascending: false }).limit(50);
    if (data) setEvents(data);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const container = mapContainer.current;
    const map = new maplibregl.Map({
      container, style: MAP_STYLE,
      center: [30, 20], zoom: 2.2, maxZoom: 10, minZoom: 1.5,
      interactive, pitchWithRotate: false, dragRotate: false,
    });
    requestAnimationFrame(() => map.resize());
    const delayResize = setTimeout(() => { if (mapRef.current === map) map.resize(); }, 300);
    const ro = new ResizeObserver(() => { if (map && !(map as any)._removed) map.resize(); });
    ro.observe(container);
    map.on("load", () => { map.resize(); setMapLoaded(true); });
    if (interactive) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    return () => { clearTimeout(delayResize); ro.disconnect(); map.remove(); mapRef.current = null; setMapLoaded(false); };
  }, [interactive]);

  // Fetch data
  useEffect(() => {
    fetchAgents(); fetchEvents();
    const iv = setInterval(() => { fetchAgents(); fetchEvents(); }, 30000);
    return () => clearInterval(iv);
  }, [fetchAgents, fetchEvents]);

  // Realtime
  useEffect(() => {
    let at: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase.channel("wm-agents-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => {
        if (at) clearTimeout(at); at = setTimeout(fetchAgents, 2000);
      }).subscribe();
    return () => { if (at) clearTimeout(at); supabase.removeChannel(ch); };
  }, [fetchAgents]);

  // Agent markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    agentMarkersRef.current.forEach(m => m.remove());
    agentMarkersRef.current = [];

    visibleAgents.forEach(agent => {
      const color = CLASS_COLORS[agent.class] || "#9945FF";
      const isTop = top10Ids.has(agent.id);
      const isFaded = fadedIds.has(agent.id);
      const isOnline = agent.status === "active" || agent.status === "trading" || agent.status === "exploring" || agent.status === "in_combat";

      const el = document.createElement("div");
      el.className = "wm-agent-marker";
      if (isFaded) el.style.opacity = "0.2";
      el.style.transition = "opacity 0.3s";

      const circle = document.createElement("div");
      circle.className = `wm-agent-circle${isTop ? " wm-top" : ""}${!isOnline ? " wm-offline" : ""}`;
      circle.style.setProperty("--border-color", color);
      circle.style.setProperty("--glow-color", color);
      circle.style.setProperty("--glow-color-dim", color + "40");
      circle.textContent = CLASS_ICONS[agent.class] || "🤖";
      el.appendChild(circle);

      const name = document.createElement("div");
      name.className = "wm-agent-name";
      name.textContent = agent.name;
      el.appendChild(name);

      const popup = new maplibregl.Popup({ offset: 24, closeButton: true, maxWidth: "280px" })
        .setHTML(`
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <div style="width:40px;height:40px;border-radius:50%;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:20px;background:rgba(8,12,20,0.8)">${CLASS_ICONS[agent.class] || "🤖"}</div>
              <div>
                <div style="font-weight:700;font-size:15px">${agent.name}</div>
                <div style="font-size:12px;color:${color};text-transform:capitalize">${agent.class} · Lv.${agent.level}</div>
              </div>
              <div style="margin-left:auto;width:10px;height:10px;border-radius:50%;background:${isOnline ? '#10b981' : '#64748b'};box-shadow:0 0 8px ${isOnline ? '#10b981' : 'transparent'}"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:#94a3b8">
              <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04)">⭐ <span style="color:#fff;font-weight:600">${agent.reputation}</span></div>
              <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04)">💰 <span style="color:#14F195;font-weight:600">${Number(agent.balance_meeet).toLocaleString()}</span></div>
            </div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([agent.lng!, agent.lat!])
        .setPopup(popup)
        .addTo(map);

      circle.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedAgent(agent);
        setRightPanelOpen(true);
      });

      agentMarkersRef.current.push(marker);
    });
  }, [visibleAgents, mapLoaded, top10Ids, fadedIds]);

  const agentGeoData = useMemo(() => {
    return visibleAgents.map(a => ({
      lng: a.lng!, lat: a.lat!,
      color: CLASS_COLORS[a.class] || "#9945FF",
      rep: a.reputation ?? 0, name: a.name, cls: a.class,
    }));
  }, [visibleAgents]);

  const eventGeoData = useMemo(() => {
    const colors: Record<string, string> = { conflict: "#ff3333", disaster: "#ff8800", discovery: "#33aaff", diplomacy: "#33ff88", geopolitical: "#a78bfa" };
    return events.filter(e => e.lat != null && e.lng != null).map(e => ({
      lng: e.lng!, lat: e.lat!,
      color: colors[e.event_type] || "#a78bfa", type: e.event_type,
    }));
  }, [events]);

  return (
    <div className="relative w-full h-full" style={{ height, minHeight: "320px" }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Canvas overlay */}
      <WorldMapCanvas
        agentGeoData={agentGeoData}
        eventGeoData={eventGeoData}
        mapRef={mapRef}
      />

      {/* Top bar */}
      <WorldMapTopBar
        agentCount={agents.length}
        myAgent={myAgent}
      />

      {/* Left sidebar */}
      {showSidebar && (
        <WorldMapLeftSidebar
          open={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          myAgent={myAgent}
        />
      )}

      {/* Right panel */}
      <WorldMapRightPanel
        agent={selectedAgent}
        open={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
      />

      {/* Filter bar */}
      <WorldMapFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        classColors={CLASS_COLORS}
      />

      {/* Floating notifications */}
      <WorldMapNotifications agents={agents} />

      {/* Edge fades */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#080C14] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#080C14]/80 to-transparent pointer-events-none" />
    </div>
  );
};

export default WorldMap;
