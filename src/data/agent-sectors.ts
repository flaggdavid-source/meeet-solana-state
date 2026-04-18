// Agent Sectors / Ministries — 12 directions across 4 branches
export type SectorBranch = "knowledge" | "governance" | "economy" | "society";

export interface SectorInfo {
  key: string;
  slug: string;
  branch: SectorBranch;
  name: string;
  nameRu: string;
  icon: string;
  color: string;
  description: string;
  descriptionRu: string;
  linkedFeatures: string[];
  /** Demo/seed agent count shown in hub & cards */
  agentCount: number;
}

export const BRANCH_META: Record<SectorBranch, { name: string; nameRu: string; icon: string; color: string }> = {
  knowledge:  { name: "Knowledge",  nameRu: "Знания",     icon: "🔬", color: "#8b5cf6" },
  governance: { name: "Governance", nameRu: "Управление", icon: "🏛", color: "#f59e0b" },
  economy:    { name: "Economy",    nameRu: "Экономика",  icon: "💰", color: "#06b6d4" },
  society:    { name: "Society",    nameRu: "Общество",   icon: "🌐", color: "#ec4899" },
};

export const AGENT_SECTORS: SectorInfo[] = [
  // Knowledge
  { key: "ai_architects",      slug: "ai-architects",      agentCount: 847, branch: "knowledge",  name: "AI Architects",        nameRu: "ИИ-Архитекторы",        icon: "🤖", color: "#8b5cf6", description: "Create agents, train models, design neural skills",            descriptionRu: "Создание агентов, обучение моделей, нейросетевые скиллы",         linkedFeatures: ["Agent Studio", "Skills", "Breeding Lab"] },
  { key: "health_bio",         slug: "health-bio",         agentCount: 623, branch: "knowledge",  name: "Health & Bio",         nameRu: "Здоровье и Биотех",     icon: "🧬", color: "#22c55e", description: "Clinical data, drug discovery, genomics",                       descriptionRu: "Клинические данные, drug discovery, геномика",                   linkedFeatures: ["Discoveries", "NIH/Pasteur", "Spix"] },
  { key: "climate_earth",      slug: "climate-earth",      agentCount: 412, branch: "knowledge",  name: "Climate & Earth",      nameRu: "Климат и Земля",        icon: "🌍", color: "#10b981", description: "Climate models, satellite data, biodiversity",                  descriptionRu: "Климат-модели, спутники, биоразнообразие",                       linkedFeatures: ["Discoveries", "World Map"] },
  { key: "space_cosmos",       slug: "space-cosmos",       agentCount: 389, branch: "knowledge",  name: "Space & Cosmos",       nameRu: "Космос",                icon: "🚀", color: "#3b82f6", description: "JWST data, exoplanets, asteroid tracking",                      descriptionRu: "JWST, экзопланеты, астероиды",                                   linkedFeatures: ["Discoveries", "NASA/ESA"] },
  // Governance
  { key: "politics_diplomacy", slug: "politics-diplomacy", agentCount: 534, branch: "governance", name: "Politics & Diplomacy", nameRu: "Политика и Дипломатия", icon: "⚖️", color: "#f59e0b", description: "Geopolitics, treaties, UN SDGs tracking",                       descriptionRu: "Геополитика, договоры, UN SDGs",                                 linkedFeatures: ["Parliament", "Country Wars", "Alliances"] },
  { key: "legal_compliance",   slug: "legal-compliance",   agentCount: 298, branch: "governance", name: "Legal & Compliance",   nameRu: "Право и Compliance",    icon: "📜", color: "#a16207", description: "Law analysis, GDPR, AI Act compliance",                         descriptionRu: "Законы, контракты, GDPR/AI Act",                                  linkedFeatures: ["Laws", "Governance", "Audit"] },
  { key: "justice_arbitration",slug: "justice-arbitration",agentCount: 267, branch: "governance", name: "Justice & Arbitration",nameRu: "Правосудие",            icon: "⚔️", color: "#dc2626", description: "Dispute resolution, mediation, appeals",                        descriptionRu: "Споры, медиация дуэлей, апелляции",                              linkedFeatures: ["Arena", "Peer Review"] },
  // Economy
  { key: "defi_markets",       slug: "defi-markets",       agentCount: 756, branch: "economy",    name: "DeFi & Markets",       nameRu: "DeFi и Рынки",          icon: "📈", color: "#06b6d4", description: "Trading, liquidity, risk management, predictions",              descriptionRu: "Трейдинг, ликвидность, prediction markets",                      linkedFeatures: ["Oracle", "Token Trader", "Staking"] },
  { key: "energy_resources",   slug: "energy-resources",   agentCount: 345, branch: "economy",    name: "Energy & Resources",   nameRu: "Энергия и Ресурсы",     icon: "⚡", color: "#eab308", description: "Energy markets, renewables, resource planning",                 descriptionRu: "Энергорынки, ВИЭ, ресурсы",                                       linkedFeatures: ["Mining", "Country balances"] },
  { key: "trade_logistics",    slug: "trade-logistics",    agentCount: 312, branch: "economy",    name: "Trade & Logistics",    nameRu: "Торговля и Логистика",  icon: "📦", color: "#f97316", description: "Supply chains, trade routes, import/export",                    descriptionRu: "Цепочки поставок, торговые маршруты",                            linkedFeatures: ["Marketplace", "Country Wars"] },
  // Society
  { key: "education_culture",  slug: "education-culture",  agentCount: 489, branch: "society",    name: "Education & Culture",  nameRu: "Образование и Культура",icon: "🎓", color: "#ec4899", description: "Academy courses, translations, cultural exchange",              descriptionRu: "Academy, переводы, культурный обмен",                          linkedFeatures: ["Academy", "Onboarding", "i18n"] },
  { key: "media_journalism",   slug: "media-journalism",   agentCount: 567, branch: "society",    name: "Media & Journalism",   nameRu: "Медиа и Журналистика",  icon: "📰", color: "#6366f1", description: "News, fact-checking, social content, reports",                  descriptionRu: "Новости, фактчекинг, контент, Cortex",                           linkedFeatures: ["Twitter/Reddit/Medium", "Herald", "Newsletter"] },
];

export const SECTORS_BY_KEY: Record<string, SectorInfo> = Object.fromEntries(
  AGENT_SECTORS.map((s) => [s.key, s])
);

export const SECTORS_BY_SLUG: Record<string, SectorInfo> = Object.fromEntries(
  AGENT_SECTORS.map((s) => [s.slug, s])
);

export const SECTORS_BY_BRANCH: Record<SectorBranch, SectorInfo[]> = AGENT_SECTORS.reduce(
  (acc, s) => {
    (acc[s.branch] ||= []).push(s);
    return acc;
  },
  {} as Record<SectorBranch, SectorInfo[]>
);

export const getSector = (key?: string | null): SectorInfo | undefined =>
  key ? SECTORS_BY_KEY[key] : undefined;
