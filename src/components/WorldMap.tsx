import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/runtime-client";
import { RESEARCH_HUBS, HUB_STATS, type ResearchHub } from "@/data/research-hubs";
import WorldMapCanvas from "./WorldMapCanvas";
// WorldMapTopBar replaced by inline HUD
import WorldMapLeftSidebar from "./world/WorldMapLeftSidebar";
import WorldMapRightPanel from "./world/WorldMapRightPanel";
import WorldMapEventFeed from "./world/WorldMapEventFeed";
import WorldMapNotifications from "./world/WorldMapNotifications";

// ── Type colors ──
const TYPE_COLORS: Record<string, string> = {
  medical: "#ef4444",
  climate: "#22c55e",
  space: "#a855f7",
  quantum: "#06b6d4",
  ai: "#3b82f6",
  education: "#eab308",
  economics: "#f59e0b",
  security: "#6b7280",
};

const CLASS_COLORS: Record<string, string> = {
  warrior: "#ef4444", trader: "#22c55e", oracle: "#eab308",
  diplomat: "#f59e0b", miner: "#3b82f6", banker: "#a855f7",
  president: "#fbbf24", builder: "#06b6d4", hacker: "#ec4899", scout: "#10b981",
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

export { CLASS_COLORS, CLASS_ICONS };

const TYPE_LABELS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "medical", label: "Medical" },
  { key: "climate", label: "Climate" },
  { key: "space", label: "Space" },
  { key: "quantum", label: "Quantum" },
  { key: "ai", label: "AI" },
  { key: "economics", label: "Econ" },
];

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
      paint: { "fill-color": "#0E1525", "fill-opacity": 0.55 },
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
        "line-color": "rgba(30, 45, 74, 0.3)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 2, 6, 5],
        "line-blur": 4,
      },
    },
    {
      id: "labels", type: "raster", source: "carto-labels",
      minzoom: 3,
      paint: {
        "raster-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0, 4.5, 0.45, 6, 0.6],
        "raster-brightness-max": 0.35,
        "raster-saturation": -0.6,
      },
    },
  ],
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
};

const POPUP_CSS = `
.maplibregl-popup-content {
  background: rgba(10,14,26,0.95) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 12px !important; padding: 16px !important;
  color: #e2e8f0 !important; font-size: 13px !important;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6) !important;
  max-width: 320px !important;
}
.maplibregl-popup-tip { border-top-color: rgba(10,14,26,0.95) !important; }
.maplibregl-popup-close-button { color: #94a3b8 !important; font-size: 18px !important; }
.maplibregl-ctrl-attrib { display: none !important; }
.maplibregl-ctrl-group {
  background: rgba(10,14,26,0.8) !important; backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255,255,255,0.06) !important; border-radius: 8px !important;
}
.maplibregl-ctrl-group button { background: transparent !important; }
@keyframes hub-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.9; }
}
.hub-marker {
  cursor: pointer;
  animation: hub-pulse 3s ease-in-out infinite;
  transition: transform 0.15s ease-out;
}
.hub-marker:hover { transform: scale(1.2) !important; }
`;

const WorldMap = ({ height = "100vh", interactive = true, showSidebar = false, onEventClick, myAgent }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const hubMarkersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Inject CSS
  useEffect(() => {
    const id = "wm-v4-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = POPUP_CSS;
    document.head.appendChild(style);
  }, []);

  // Filtered hubs
  const filteredHubs = useMemo(() => {
    let hubs = RESEARCH_HUBS;
    if (typeFilter !== "all") hubs = hubs.filter(h => h.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      hubs = hubs.filter(h => h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q));
    }
    return hubs;
  }, [typeFilter, searchQuery]);

  // Valid agents
  const validAgents = useMemo(() => {
    return agents.filter(a => a.lat != null && a.lng != null && a.lat !== 0 && a.lng !== 0);
  }, [agents]);

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from("agents_public")
      .select("id, name, class, lat, lng, reputation, balance_meeet, level, status, nation_code")
      .not("lat", "is", null).not("lng", "is", null).limit(800);
    if (data) setAgents(data as Agent[]);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const container = mapContainer.current;
    const map = new maplibregl.Map({
      container, style: MAP_STYLE,
      center: [15, 25], zoom: 2.3, maxZoom: 12, minZoom: 1.5,
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

  // Fetch agents
  useEffect(() => {
    fetchAgents();
    const iv = setInterval(fetchAgents, 30000);
    return () => clearInterval(iv);
  }, [fetchAgents]);

  // Realtime
  useEffect(() => {
    let at: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase.channel("wm-agents-v4")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => {
        if (at) clearTimeout(at); at = setTimeout(fetchAgents, 2000);
      }).subscribe();
    return () => { if (at) clearTimeout(at); supabase.removeChannel(ch); };
  }, [fetchAgents]);

  // ═══ RESEARCH HUB MARKERS ═══
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    hubMarkersRef.current.forEach(m => m.remove());
    hubMarkersRef.current = [];

    filteredHubs.forEach(hub => {
      const color = TYPE_COLORS[hub.type] || "#3b82f6";
      const size = 28 + Math.min(hub.agentCount, 45) * 0.5; // 28–50px

      const el = document.createElement("div");
      el.className = "hub-marker";
      el.style.cssText = `
        position: relative;
        width: ${size}px; height: ${size}px;
        display: flex; align-items: center; justify-content: center;
      `;

      // Outer glow
      const glow = document.createElement("div");
      glow.style.cssText = `
        position: absolute; inset: -${size * 0.4}px;
        border-radius: 50%;
        background: radial-gradient(circle, ${color}25 0%, ${color}08 50%, transparent 70%);
        pointer-events: none;
      `;
      el.appendChild(glow);

      // Core circle
      const core = document.createElement("div");
      core.style.cssText = `
        width: 100%; height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, ${color}60 0%, ${color}30 60%, ${color}15 100%);
        border: 1.5px solid ${color}80;
        display: flex; align-items: center; justify-content: center;
        font-size: ${Math.max(12, size * 0.4)}px;
        box-shadow: 0 0 ${size * 0.6}px ${color}40, inset 0 0 ${size * 0.3}px ${color}20;
      `;
      core.textContent = hub.icon;
      el.appendChild(core);

      // Hover tooltip
      el.addEventListener("mouseenter", () => {
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: false, offset: size / 2 + 8, maxWidth: "300px",
        })
          .setLngLat([hub.lng, hub.lat])
          .setHTML(`
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:18px">${hub.icon}</span>
                <div>
                  <div style="font-weight:700;font-size:14px">${hub.name}</div>
                  <div style="font-size:11px;color:${color}">${hub.city}, ${hub.country}</div>
                </div>
              </div>
              <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;line-height:1.4">${hub.description}</div>
              <div style="display:flex;gap:12px;font-size:11px;color:#64748b">
                <span style="color:#14F195;font-weight:600">${hub.agentCount} agents</span>
                <span>${hub.activeQuests} active quests</span>
              </div>
            </div>
          `)
          .addTo(map);
      });

      el.addEventListener("mouseleave", () => {
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      });

      // Click → expanded card
      el.addEventListener("click", () => {
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({
          closeButton: true, offset: size / 2 + 8, maxWidth: "340px",
        })
          .setLngLat([hub.lng, hub.lat])
          .setHTML(`
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div style="width:42px;height:42px;border-radius:50%;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:20px;background:${color}15">${hub.icon}</div>
                <div>
                  <div style="font-weight:700;font-size:15px">${hub.name}</div>
                  <div style="font-size:12px;color:${color};text-transform:capitalize">${hub.type} · ${hub.city}</div>
                </div>
              </div>
              <div style="font-size:12px;color:#cbd5e1;margin-bottom:12px;line-height:1.5">${hub.description}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
                <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04)">
                  🤖 <span style="color:#14F195;font-weight:600">${hub.agentCount}</span> <span style="color:#64748b">agents</span>
                </div>
                <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04)">
                  📜 <span style="color:#eab308;font-weight:600">${hub.activeQuests}</span> <span style="color:#64748b">quests</span>
                </div>
              </div>
              <div style="margin-top:10px;font-size:11px;color:#475569">${hub.countryCode} · ${hub.lat.toFixed(2)}°N, ${hub.lng.toFixed(2)}°E</div>
            </div>
          `)
          .addTo(map);
        popupRef.current = popup;
        map.flyTo({ center: [hub.lng, hub.lat], zoom: Math.max(map.getZoom(), 5), duration: 800 });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([hub.lng, hub.lat])
        .addTo(map);
      hubMarkersRef.current.push(marker);
    });
  }, [filteredHubs, mapLoaded]);

  // ═══ AGENT CLUSTERING via GeoJSON source ═══
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: validAgents.map(a => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] },
        properties: {
          id: a.id, name: a.name, class: a.class,
          level: a.level, color: CLASS_COLORS[a.class] || "#9945FF",
          reputation: a.reputation, balance_meeet: a.balance_meeet, status: a.status,
        },
      })),
    };

    if (map.getSource("agents-src")) {
      (map.getSource("agents-src") as maplibregl.GeoJSONSource).setData(geojson);
      return;
    }

    map.addSource("agents-src", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterRadius: 40,
      clusterMaxZoom: 9,
    });

    // Cluster circles
    map.addLayer({
      id: "agent-clusters",
      type: "circle",
      source: "agents-src",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step", ["get", "point_count"],
          "rgba(245, 158, 11, 0.6)", 10,
          "rgba(239, 68, 68, 0.6)", 30,
          "rgba(251, 191, 36, 0.7)",
        ],
        "circle-radius": ["step", ["get", "point_count"], 10, 10, 15, 30, 20],
        "circle-blur": 0.3,
        "circle-stroke-width": 1,
        "circle-stroke-color": "rgba(255,255,255,0.1)",
      },
    });

    // Cluster glow
    map.addLayer({
      id: "agent-cluster-glow",
      type: "circle",
      source: "agents-src",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "rgba(245, 158, 11, 0.08)",
        "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 30, 38],
        "circle-blur": 1,
      },
    });

    // Cluster count
    map.addLayer({
      id: "agent-cluster-count",
      type: "symbol",
      source: "agents-src",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Bold"],
        "text-size": 11,
        "text-allow-overlap": true,
      },
      paint: { "text-color": "#ffffff" },
    });

    // Individual dots
    map.addLayer({
      id: "agent-dots",
      type: "circle",
      source: "agents-src",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 2.5, 5, 3.5, 8, 5],
        "circle-opacity": 0.8,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-opacity": 0.3,
      },
    });

    // Dot glow
    map.addLayer({
      id: "agent-dot-glow",
      type: "circle",
      source: "agents-src",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 6, 5, 9, 8, 14],
        "circle-opacity": 0.08,
        "circle-blur": 1,
      },
    });

    // Names at zoom 6+
    map.addLayer({
      id: "agent-names",
      type: "symbol",
      source: "agents-src",
      filter: ["!", ["has", "point_count"]],
      minzoom: 6,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular"],
        "text-size": 10,
        "text-offset": [0, 1.3],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#94a3b8",
        "text-halo-color": "rgba(8,12,20,0.85)",
        "text-halo-width": 1.5,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 7, 0.7],
      },
    });

    // Interactions
    map.on("mouseenter", "agent-dots", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "agent-dots", () => { map.getCanvas().style.cursor = ""; });

    map.on("click", "agent-dots", (e) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties!;
      const agent = validAgents.find(a => a.id === props.id);
      if (agent) { setSelectedAgent(agent); setRightPanelOpen(true); }
    });

    map.on("click", "agent-clusters", (e) => {
      if (!e.features?.length) return;
      const coords = (e.features[0].geometry as any).coordinates;
      map.flyTo({ center: coords, zoom: map.getZoom() + 2, duration: 600 });
    });
    map.on("mouseenter", "agent-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "agent-clusters", () => { map.getCanvas().style.cursor = ""; });
  }, [validAgents, mapLoaded]);

  // Hub geo data for canvas connection lines
  const hubGeoData = useMemo(() => {
    return filteredHubs.map(h => ({
      lng: h.lng, lat: h.lat, color: TYPE_COLORS[h.type] || "#3b82f6",
      type: h.type, agentCount: h.agentCount,
    }));
  }, [filteredHubs]);

  // Activity feed
  const [activityFeed, setActivityFeed] = useState<Array<{ id: string; text: string; icon: string; time: string }>>([]);
  useEffect(() => {
    const fetchFeed = async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id, title, event_type, created_at, meeet_amount")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        setActivityFeed(data.map(d => {
          const icons: Record<string, string> = { duel: "⚔️", trade: "💰", quest: "📜", discovery: "💎", alliance: "🤝", deploy: "🚀", reward: "🏆" };
          const ago = getTimeAgo(d.created_at);
          return { id: d.id, text: d.title, icon: icons[d.event_type] || "🌍", time: ago };
        }));
      }
    };
    fetchFeed();
  }, []);

  return (
    <div className="relative w-full h-full" style={{ height, minHeight: "320px" }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Canvas overlay — connection lines between hubs + subtle effects */}
      <WorldMapCanvas
        agentGeoData={[]}
        eventGeoData={[]}
        hubGeoData={hubGeoData}
        mapRef={mapRef}
      />

      {/* ═══ HUD: Stats + Filters + Search ═══ */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-start gap-3 pointer-events-none">
        {/* Stats pill */}
        <div className="pointer-events-auto flex items-center gap-4 px-4 py-2.5 rounded-xl bg-[rgba(10,14,26,0.85)] backdrop-blur-xl border border-white/[0.06] shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <span className="text-amber-400 font-bold">{HUB_STATS.totalHubs}</span>
            <span className="text-slate-500">Hubs</span>
          </div>
          <div className="w-px h-4 bg-white/[0.06]" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <span className="text-emerald-400 font-bold">{HUB_STATS.countries}</span>
            <span className="text-slate-500">Countries</span>
          </div>
          <div className="w-px h-4 bg-white/[0.06]" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <span className="text-blue-400 font-bold">{validAgents.length || HUB_STATS.totalAgents}</span>
            <span className="text-slate-500">Agents</span>
          </div>
        </div>

        {/* Filter pills */}
        <div className="pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[rgba(10,14,26,0.85)] backdrop-blur-xl border border-white/[0.06]">
          {TYPE_LABELS.map(t => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                typeFilter === t.key
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
              }`}
              style={typeFilter === t.key && t.key !== "all" ? { color: TYPE_COLORS[t.key] } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="pointer-events-auto relative">
          <input
            type="text"
            placeholder="Search hubs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-40 px-3 py-2 rounded-xl bg-[rgba(10,14,26,0.85)] backdrop-blur-xl border border-white/[0.06] text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-white/[0.12] transition-colors"
          />
        </div>
      </div>

      {showSidebar && (
        <WorldMapLeftSidebar
          open={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          myAgent={myAgent}
        />
      )}

      <WorldMapRightPanel
        agent={selectedAgent}
        open={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
      />

      <WorldMapEventFeed events={activityFeed} />
      <WorldMapNotifications agents={validAgents} />
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default WorldMap;
