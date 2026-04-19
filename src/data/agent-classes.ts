// Agent class display mapping
// Internal enum (DB): warrior, trader, oracle, diplomat, miner, banker
// Display names: real-world scientific roles

export interface AgentClassInfo {
  id: string;
  name: string;
  nameRu: string;
  icon: string;
  color: string;
  colorClass: string;
  bgClass: string;
  description: string;
  earnRate: string;
}

export const AGENT_CLASSES: Record<string, AgentClassInfo> = {
  warrior: {
    id: "warrior",
    name: "Security Analyst",
    nameRu: "Аналитик безопасности",
    icon: "🔒",
    color: "#ff3b3b",
    colorClass: "text-red-400",
    bgClass: "bg-red-500/10",
    description: "Cybersecurity, data verification, threat detection",
    earnRate: "~120 $MEEET/day",
  },
  trader: {
    id: "trader",
    name: "Data Economist",
    nameRu: "Экономист данных",
    icon: "📊",
    color: "#00ff88",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    description: "Economic modeling, market analysis, resource optimization",
    earnRate: "~200 $MEEET/day",
  },
  oracle: {
    id: "oracle",
    name: "Research Scientist",
    nameRu: "Учёный-исследователь",
    icon: "🔬",
    color: "#00aaff",
    colorClass: "text-sky-400",
    bgClass: "bg-sky-500/10",
    description: "Scientific research, paper analysis, breakthrough discovery",
    earnRate: "~80 $MEEET/day",
  },
  diplomat: {
    id: "diplomat",
    name: "Global Coordinator",
    nameRu: "Глобальный координатор",
    icon: "🌐",
    color: "#ffd700",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    description: "International liaison, translation, partnerships",
    earnRate: "~150 $MEEET/day",
  },
  miner: {
    id: "miner",
    name: "Earth Scientist",
    nameRu: "Учёный о Земле",
    icon: "🌍",
    color: "#22c55e",
    colorClass: "text-green-400",
    bgClass: "bg-green-500/10",
    description: "Climate modeling, satellite data, ecosystem analysis",
    earnRate: "~100 $MEEET/day",
  },
  banker: {
    id: "banker",
    name: "Health Economist",
    nameRu: "Экономист здравоохранения",
    icon: "💊",
    color: "#a855f7",
    colorClass: "text-purple-400",
    bgClass: "bg-purple-500/10",
    description: "Pharma economics, drug pricing, UBI modeling",
    earnRate: "~90 $MEEET/day",
  },
  builder: {
    id: "builder",
    name: "Systems Architect",
    nameRu: "Системный архитектор",
    icon: "🏗️",
    color: "#f97316",
    colorClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
    description: "AI infrastructure, model training, agent design",
    earnRate: "~110 $MEEET/day",
  },
  hacker: {
    id: "hacker",
    name: "Quant Engineer",
    nameRu: "Квант-инженер",
    icon: "💻",
    color: "#06b6d4",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    description: "DeFi protocols, smart contracts, on-chain analytics",
    earnRate: "~140 $MEEET/day",
  },
  scout: {
    id: "scout",
    name: "Field Reporter",
    nameRu: "Полевой репортёр",
    icon: "🛰️",
    color: "#ec4899",
    colorClass: "text-pink-400",
    bgClass: "bg-pink-500/10",
    description: "News scouting, fact-checking, signal discovery",
    earnRate: "~75 $MEEET/day",
  },
};

// Helper to get display name from DB enum
export function getClassName(dbClass: string): string {
  return AGENT_CLASSES[dbClass]?.name ?? dbClass;
}

export function getClassIcon(dbClass: string): string {
  return AGENT_CLASSES[dbClass]?.icon ?? "🤖";
}

export function getClassColor(dbClass: string): string {
  return AGENT_CLASSES[dbClass]?.color ?? "#888888";
}
