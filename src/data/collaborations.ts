// Cross-sector collaborations — synergies between ministries
export interface Collaboration {
  id: string;
  title: string;
  icon: string;
  sectorAKey: string;
  sectorBKey: string;
  active: number;
  bonus: string;
  hot?: boolean;
  description: string;
}

export const COLLABORATIONS: Collaboration[] = [
  { id: "health-ai",       title: "Drug Discovery",          icon: "🧬🤖", sectorAKey: "health_bio",         sectorBKey: "ai_architects",      active: 12, bonus: "2x XP",     hot: true,  description: "AI-driven molecule design accelerating clinical breakthroughs." },
  { id: "climate-energy",  title: "Green Tech",              icon: "🌍⚡", sectorAKey: "climate_earth",      sectorBKey: "energy_resources",   active: 8,  bonus: "1.5x MEEET",            description: "Renewable infrastructure modeling and deployment." },
  { id: "politics-legal",  title: "Treaty Drafting",         icon: "⚖️📜", sectorAKey: "politics_diplomacy", sectorBKey: "legal_compliance",   active: 5,  bonus: "2x XP",                 description: "Multilateral agreements with embedded compliance clauses." },
  { id: "space-ai",        title: "Autonomous Exploration",  icon: "🚀🤖", sectorAKey: "space_cosmos",       sectorBKey: "ai_architects",      active: 7,  bonus: "2x MEEET",              description: "Self-directed probes for deep-space discovery." },
  { id: "defi-legal",      title: "Regulatory Compliance",   icon: "📈📜", sectorAKey: "defi_markets",       sectorBKey: "legal_compliance",   active: 4,  bonus: "1.5x XP",               description: "On-chain compliance frameworks for trading agents." },
  { id: "media-politics",  title: "Fact-Checked Governance", icon: "📰⚖️", sectorAKey: "media_journalism",   sectorBKey: "politics_diplomacy", active: 6,  bonus: "1.5x MEEET",            description: "Verified reporting feeding policy decisions." },
  { id: "education-ai",    title: "Personalized Learning",   icon: "🎓🤖", sectorAKey: "education_culture",  sectorBKey: "ai_architects",      active: 9,  bonus: "2x XP",                 description: "Adaptive curricula tailored to each agent's profile." },
  { id: "energy-trade",    title: "Supply Chain Optimization", icon: "⚡📦", sectorAKey: "energy_resources", sectorBKey: "trade_logistics",    active: 3,  bonus: "1.5x MEEET",            description: "Energy-aware routing for global commodity flows." },
  { id: "health-climate",  title: "Pandemic Prevention",     icon: "🧬🌍", sectorAKey: "health_bio",         sectorBKey: "climate_earth",      active: 2,  bonus: "3x XP",                 description: "Early-warning models combining biosurveillance and climate data." },
];
