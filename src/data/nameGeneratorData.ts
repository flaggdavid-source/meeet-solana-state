// Pre-built name arrays per category for deterministic generation

export const nameCategories = ["startup", "ai_agent", "game_character", "pet", "band"] as const;
export type NameCategory = typeof nameCategories[number];

export const categoryLabels: Record<NameCategory, string> = {
  startup: "Startup",
  ai_agent: "AI Agent",
  game_character: "Game Character",
  pet: "Pet",
  band: "Band",
};

const names: Record<NameCategory, string[]> = {
  startup: [
    "NovaSpark", "Synthera", "QuantumLeap", "NeuraFlow", "PulseForge",
    "VeloCity", "DataHive", "CloudNexus", "PixelForge", "OmniStack",
    "ZenithLabs", "ByteBridge", "AuroraTech", "CortexAI", "FluxPoint",
    "IronMind", "StarGrid", "WaveSync", "PrismCore", "TerraNode",
    "AgileVerse", "CodeHarbor", "DeepRoot", "EchoLabs", "FusionBit",
    "GlyphTech", "HyperRail", "InfinLoop", "JetPath", "KineticOS",
    "LunarByte", "MeshWork", "NeonPulse", "OptiScale", "ParaFlow",
    "QuantaHub", "RiftWare", "SkyLoom", "TidalShift", "UltraGrid",
    "VortexIO", "WindSail", "XenoBase", "YieldStack", "ZetaForge",
    "AlphaVolt", "BrightNode", "CipherNet", "DawnSync", "ElectraCore",
  ],
  ai_agent: [
    "Athena-7", "Cortex-X", "NeuraStar", "SkyeBot", "QuantumPhoenix",
    "DataHawk", "CyberOwl", "NovaMind", "PulseAgent", "OracleZero",
    "Sentinel-4", "VoxAgent", "MeshGuard", "NexusAlpha", "EchoStar",
    "IronLogic", "FluxBot", "SolPilot", "WarpMind", "ZenithAgent",
    "ArcticFox", "BladeRunner", "ChromeEye", "DeltaForce", "EmberLight",
    "FrostByte", "GhostNode", "HaloWatch", "IndigoMind", "JadeGuard",
    "KryptonEye", "LunarWatch", "MercuryBot", "NebulaCore", "OnyxAgent",
    "PhoenixEye", "QuasarBot", "RadiantAI", "ShadowNet", "TitanMind",
    "UltraVox", "VoidWalker", "WhisperAI", "XenonBot", "YggdrasilAI",
    "ZephyrNet", "ApexMind", "BoltAgent", "CosmicEye", "DuskGuard",
  ],
  game_character: [
    "Shadowblade", "Ironheart", "Stormweaver", "Frostfang", "Emberwolf",
    "Nightshade", "Thunderclap", "Moonshard", "Ashwalker", "Voidreaver",
    "Starforge", "Grimthorn", "Dawnbringer", "Crystalvein", "Blazeborn",
    "Silverthorn", "Darkhollow", "Sunstrider", "Iceveil", "Wraithbane",
    "Bonecrusher", "Coilstrike", "Dreadmaw", "Elderwood", "Flamecrest",
    "Goldspire", "Hailstorm", "Ironfist", "Jadeclaw", "Kingslayer",
    "Lichborn", "Magebane", "Nightfall", "Orcsbane", "Phantomstep",
    "Quicksilver", "Runeward", "Soulreaper", "Thunderborn", "Undying",
    "Venomstrike", "Warshield", "Xenofire", "Yeomanry", "Zealotblade",
    "Arcaneshot", "Berserk", "Celestine", "Doomhammer", "Eclipseborn",
  ],
  pet: [
    "Biscuit", "Mochi", "Nimbus", "Pixel", "Ziggy",
    "Maple", "Pebbles", "Cosmo", "Waffles", "Noodle",
    "Clover", "Truffle", "Hazel", "Jasper", "Luna",
    "Pepper", "Sage", "Tofu", "Willow", "Atlas",
    "Basil", "Cleo", "Dottie", "Echo", "Fern",
    "Ginger", "Hugo", "Indie", "Juniper", "Kiwi",
    "Loki", "Mango", "Nova", "Olive", "Pippin",
    "Quill", "Rosie", "Snickers", "Tango", "Uma",
    "Vesper", "Winnie", "Xena", "Yuki", "Zelda",
    "Alfie", "Bean", "Chai", "Daisy", "Ember",
  ],
  band: [
    "Velvet Void", "Neon Ghosts", "Static Bloom", "Crystal Riot", "Midnight Protocol",
    "Echo Chamber", "Silver Tongue", "Dark Matter", "Iron Petals", "Glass Animals",
    "Electric Moss", "Phantom Wave", "Solar Flare", "Rust & Gold", "Arctic Pulse",
    "Broken Compass", "Carbon Bloom", "Digital Haze", "Emerald Static", "Frozen Light",
    "Gravity Well", "Hollow Sun", "Ivory Tower", "Jade Circuit", "Kaleidoscope",
    "Liquid Stone", "Mercury Rise", "Nebula Drift", "Obsidian Rain", "Paper Moon",
    "Quantum Leap", "Red Horizon", "Sapphire Dust", "Thunder Rose", "Urban Myth",
    "Violet Storm", "Winter Sound", "Xenon Lights", "Yellow Brick", "Zero Gravity",
    "Amber Waves", "Black Orchid", "Crimson Tide", "Dawn Treader", "Echo Valley",
    "Fire & Silk", "Golden Hour", "Haze Machine", "Indigo Sun", "Jazz Noir",
  ],
};

// Simple hash for deterministic selection
function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateNames(category: NameCategory, description: string, count = 5): string[] {
  const pool = names[category];
  const hash = simpleHash(`${category}:${description.toLowerCase().trim()}`);
  const results: string[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let idx = (hash + i * 7 + i * i * 3) % pool.length;
    while (used.has(idx)) idx = (idx + 1) % pool.length;
    used.add(idx);
    results.push(pool[idx]);
  }
  return results;
}

// Sentiment word lists
export const positiveWords = new Set([
  "good", "great", "excellent", "amazing", "wonderful", "fantastic", "awesome",
  "love", "happy", "joy", "beautiful", "perfect", "best", "brilliant", "outstanding",
  "superb", "incredible", "magnificent", "delightful", "pleasant", "enjoy", "success",
  "win", "positive", "helpful", "innovative", "exciting", "impressive", "valuable",
  "efficient", "powerful", "easy", "fast", "reliable", "secure", "clean", "smart",
]);

export const negativeWords = new Set([
  "bad", "terrible", "awful", "horrible", "hate", "ugly", "worst", "poor", "fail",
  "broken", "slow", "expensive", "difficult", "problem", "error", "bug", "crash",
  "annoying", "frustrating", "disappointing", "useless", "weak", "boring", "confusing",
  "complicated", "dangerous", "risk", "threat", "scam", "fake", "wrong", "loss",
  "damage", "pain", "stress", "angry", "sad", "fear", "worry",
]);

// Hardcoded crypto prices
export const cryptoPrices: Record<string, number> = {
  sol: 150, btc: 65000, eth: 3500, bnb: 580, xrp: 0.62,
  ada: 0.45, doge: 0.08, dot: 7.5, avax: 35, matic: 0.85,
  link: 14, uni: 7.2, atom: 9.5, near: 5.2, apt: 8.5,
  meeet: 0.000015, usdt: 1, usdc: 1, dai: 1,
};

// Cities for live ticker
export const globalCities = [
  "Tokyo", "Berlin", "New York", "London", "Paris", "Seoul", "Singapore",
  "Dubai", "São Paulo", "Mumbai", "Sydney", "Toronto", "Amsterdam", "Stockholm",
  "Barcelona", "Lagos", "Nairobi", "Bangkok", "Jakarta", "Mexico City",
  "Buenos Aires", "Cape Town", "Istanbul", "Warsaw", "Prague", "Vienna",
  "Zurich", "Helsinki", "Oslo", "Dublin", "Lisbon", "Milan",
];

export const liveEventTemplates = [
  "just deployed a BioTech agent",
  "earned 150 $MEEET staking reward",
  "completed Weekly Challenge",
  "shared an AI analysis",
  "joined MEEET STATE as a new citizen",
  "staked 5,000 $MEEET tokens",
  "deployed a DeFi analyst agent",
  "completed 5 daily quests",
  "reached Builder tier",
  "voted on a governance proposal",
];
