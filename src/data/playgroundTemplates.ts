export interface PlaygroundTemplate {
  title: string;
  confidence: number;
  paragraphs: string[];
  sourceCount: number;
  tags: string[];
}

export type PlaygroundDomain = "biotech" | "energy" | "quantum" | "space" | "defi" | "climate";

export const domainMeta: Record<PlaygroundDomain, { icon: string; label: string; color: string }> = {
  biotech: { icon: "🧬", label: "BioTech", color: "emerald" },
  energy: { icon: "⚡", label: "Energy", color: "amber" },
  quantum: { icon: "🔬", label: "Quantum", color: "violet" },
  space: { icon: "🚀", label: "Space", color: "sky" },
  defi: { icon: "💰", label: "DeFi", color: "orange" },
  climate: { icon: "🌍", label: "Climate", color: "teal" },
};

export const placeholderQuestions: Record<PlaygroundDomain, string[]> = {
  biotech: ["Is CRISPR safe for gene therapy?", "Can mRNA vaccines cure cancer?", "Will synthetic biology replace farming?"],
  energy: ["Best renewable energy for Africa?", "Can fusion power be viable by 2035?", "How efficient are perovskite solar cells?"],
  quantum: ["Will quantum computing break encryption by 2030?", "What is quantum advantage in drug discovery?", "Can quantum sensors improve MRI accuracy?"],
  space: ["Is Mars colonization feasible by 2040?", "Can asteroid mining be profitable?", "Will space elevators ever work?"],
  defi: ["Is Solana DeFi sustainable long-term?", "Can AI agents replace fund managers?", "What's the future of decentralized insurance?"],
  climate: ["Can carbon capture reverse warming?", "What's the best reforestation strategy?", "Will ocean cleanup tech scale globally?"],
};

const templates: Record<PlaygroundDomain, PlaygroundTemplate[]> = {
  biotech: [
    {
      title: "CRISPR & Gene Therapy Risk Assessment",
      confidence: 89,
      paragraphs: [
        "Our analysis of 2,847 peer-reviewed studies indicates that CRISPR-Cas9 gene editing has reached a maturity threshold where off-target effects are below 0.3% in clinical applications. Recent advances in base-editing and prime-editing further reduce unintended modifications, making therapeutic applications increasingly viable for monogenic disorders.",
        "Cross-referencing clinical trial data from 47 institutions reveals a safety profile comparable to traditional viral vector therapies, with significantly lower immunogenic response rates. The FDA's accelerated approval pathway for CRISPR therapeutics in 2024 marks a regulatory milestone that validates years of safety research.",
        "However, germline editing remains ethically contentious and technically challenging. Our network of 312 biotech agents identified key risks including mosaicism in embryonic applications and long-term epigenetic effects that require multi-generational studies before widespread clinical adoption.",
        "Recommendation: CRISPR-based somatic cell therapies are entering a golden age of clinical application. Investment in delivery mechanism optimization (lipid nanoparticles, AAV vectors) represents the highest-impact research frontier for the next 3-5 years.",
      ],
      sourceCount: 67,
      tags: ["peer-reviewed", "clinical-data", "high-confidence"],
    },
    {
      title: "Synthetic Biology & Agricultural Transformation",
      confidence: 82,
      paragraphs: [
        "Analysis of 1,203 agricultural biotech papers suggests synthetic biology will augment rather than replace traditional farming within the next decade. Engineered nitrogen-fixing bacteria show 34% yield improvements in field trials, reducing fertilizer dependency significantly.",
        "Our agents cross-referenced economic models from 23 countries and found that synthetic biology adoption faces regulatory bottlenecks in the EU and parts of Asia, while North and South American markets are accelerating adoption at 18% CAGR.",
        "Key concern: Biodiversity impact assessments remain incomplete for most engineered organisms. Only 12% of synthetic biology startups have conducted comprehensive ecological risk studies, representing a critical gap in the field's safety infrastructure.",
      ],
      sourceCount: 43,
      tags: ["cross-validated", "economic-analysis", "moderate-confidence"],
    },
    {
      title: "mRNA Platform Evolution & Oncology Applications",
      confidence: 91,
      paragraphs: [
        "Building on COVID-19 vaccine success, mRNA technology is showing remarkable results in personalized cancer vaccines. Phase II trials across 8 tumor types demonstrate 44% improvement in progression-free survival when combined with checkpoint inhibitors.",
        "Our analysis of 3,100+ clinical records reveals that mRNA-based therapies have a manufacturing advantage: production timelines are 60% shorter than traditional biologics, enabling rapid iteration of personalized treatment protocols.",
        "The convergence of AI-driven neoantigen prediction and mRNA delivery optimization represents a paradigm shift. Our biotech agent network estimates the addressable market will reach $47B by 2030, with solid tumor applications leading adoption.",
        "Risk factors include cold-chain logistics in developing nations and potential immune tolerance development with repeated dosing. Current research into self-amplifying RNA (saRNA) may address the latter concern.",
      ],
      sourceCount: 78,
      tags: ["peer-reviewed", "clinical-trial", "high-confidence"],
    },
  ],
  energy: [
    {
      title: "Renewable Energy Viability for Sub-Saharan Africa",
      confidence: 87,
      paragraphs: [
        "Analysis of solar irradiance data across 54 African nations reveals that distributed solar-plus-storage systems offer the most cost-effective electrification pathway, achieving levelized costs of $0.05-0.08/kWh — 40% below diesel generation alternatives.",
        "Our energy agents identified that mini-grid deployments in East Africa have achieved 92% uptime reliability, challenging the narrative that renewable-only grids are unreliable. Kenya's 93% renewable electricity mix serves as a compelling proof-of-concept.",
        "Key barrier: financing models remain the primary obstacle, not technology. Only 2% of global clean energy investment flows to Africa despite the continent hosting 60% of the world's best solar resources. Blended finance mechanisms and carbon credit markets are unlocking new capital flows.",
        "Recommendation: Prioritize investment in agri-voltaics (combined solar farming) which show 35% land-use efficiency improvements and provide dual revenue streams for rural communities.",
      ],
      sourceCount: 52,
      tags: ["cross-validated", "economic-model", "high-confidence"],
    },
    {
      title: "Fusion Energy Timeline & Commercial Viability",
      confidence: 76,
      paragraphs: [
        "Cross-referencing progress from 23 fusion startups and 4 government programs, our analysis suggests commercial fusion power is achievable by 2037-2042, roughly 5 years later than most optimistic projections but 15 years earlier than historical consensus.",
        "The shift to high-temperature superconducting (HTS) magnets has been transformative. MIT/CFS's SPARC program and other compact tokamak designs are achieving plasma conditions that would have required building-sized reactors a decade ago.",
        "Economic modeling suggests fusion electricity must reach $0.06/kWh to compete with advanced renewables-plus-storage, requiring significant engineering optimization beyond scientific breakeven. First-of-a-kind plants will likely produce electricity at 3-5x this target.",
      ],
      sourceCount: 38,
      tags: ["cross-validated", "projection-model", "moderate-confidence"],
    },
    {
      title: "Perovskite Solar Cell Efficiency & Commercialization",
      confidence: 85,
      paragraphs: [
        "Perovskite-silicon tandem cells have now exceeded 33% laboratory efficiency, surpassing the theoretical limit of standalone silicon. Our analysis of 1,400 materials science publications confirms that stability — not efficiency — remains the primary commercialization barrier.",
        "Accelerated aging tests show leading perovskite formulations now retain 95% performance after 1,000 hours of illumination, up from just 80% three years ago. Encapsulation breakthroughs using atomic layer deposition are extending operational lifetimes toward the 25-year industry benchmark.",
        "Manufacturing cost projections from our industrial partners indicate perovskite tandems could reach $0.15/W at scale — 30% below current silicon module pricing — potentially triggering the next major cost reduction wave in solar energy.",
        "Risk: Lead toxicity in conventional perovskites drives regulatory scrutiny. Tin-based alternatives show promising stability but currently sacrifice 4-6% absolute efficiency.",
      ],
      sourceCount: 61,
      tags: ["peer-reviewed", "materials-science", "high-confidence"],
    },
  ],
  quantum: [
    {
      title: "Post-Quantum Cryptography Transition Assessment",
      confidence: 88,
      paragraphs: [
        "Our quantum threat analysis — synthesizing data from 1,200+ research papers and 47 quantum hardware roadmaps — indicates that cryptographically relevant quantum computers (CRQC) capable of breaking RSA-2048 are unlikely before 2033, with a 90% confidence interval extending to 2038.",
        "NIST's post-quantum cryptography standards (CRYSTALS-Kyber, CRYSTALS-Dilithium) are ready for deployment, but our network analysis reveals that only 3% of enterprise systems have begun migration. The 'harvest now, decrypt later' threat means organizations with long-lived secrets should prioritize migration immediately.",
        "Hybrid classical-quantum cryptographic schemes offer the most pragmatic transition path, allowing organizations to maintain backward compatibility while adding quantum-resistant security layers. Our agents recommend a 3-phase migration over 5-7 years for most enterprises.",
        "Critical finding: Quantum key distribution (QKD) networks are expanding rapidly in China (4,600km backbone) but remain economically unviable for most Western deployments. Software-based post-quantum algorithms are the practical choice for 99% of use cases.",
      ],
      sourceCount: 72,
      tags: ["peer-reviewed", "threat-assessment", "high-confidence"],
    },
    {
      title: "Quantum Computing in Drug Discovery",
      confidence: 79,
      paragraphs: [
        "Quantum advantage in molecular simulation is emerging for specific problem classes. Our analysis of 890 computational chemistry studies shows that variational quantum eigensolvers (VQE) can model molecules with 50+ electrons more accurately than classical DFT methods, though current hardware noise limits practical applications.",
        "Hybrid quantum-classical workflows are the near-term sweet spot. Companies like Recursion and Insilico Medicine report 25-40% reduction in lead compound identification time using quantum-enhanced virtual screening pipelines.",
        "Full quantum advantage in pharma R&D — simulating entire protein-ligand interactions — requires error-corrected quantum computers with 10,000+ logical qubits, estimated to arrive between 2030-2035.",
      ],
      sourceCount: 44,
      tags: ["cross-validated", "computational-study", "moderate-confidence"],
    },
    {
      title: "Quantum Sensing Revolution in Medical Imaging",
      confidence: 83,
      paragraphs: [
        "Nitrogen-vacancy (NV) center quantum sensors are demonstrating magnetic field sensitivity 100x beyond conventional SQUID detectors. Our analysis of 560 physics and medical imaging papers identifies cardiology and neuroscience as the highest-impact clinical applications.",
        "Quantum magnetometers operating at room temperature are now achieving sub-femtotesla sensitivity, enabling non-invasive brain-computer interfaces and early-stage tumor detection through magnetic signature analysis.",
        "Market analysis: The quantum sensing market is projected to reach $3.2B by 2028, with medical applications representing 35% of demand. Key players include Qnami, SQC, and multiple university spinouts receiving significant venture funding.",
        "Limitation: Current quantum sensors require magnetically shielded environments for optimal performance. Advances in active noise cancellation could enable deployment in standard clinical settings within 3-5 years.",
      ],
      sourceCount: 56,
      tags: ["peer-reviewed", "clinical-potential", "high-confidence"],
    },
  ],
  space: [
    {
      title: "Mars Colonization Feasibility Assessment",
      confidence: 78,
      paragraphs: [
        "Our comprehensive analysis of 2,100+ aerospace engineering papers and mission architectures indicates that a permanent Mars settlement is technically feasible by 2042-2048, contingent on solving three critical challenges: radiation shielding, in-situ resource utilization (ISRU), and closed-loop life support systems.",
        "SpaceX's Starship program has fundamentally altered the economics of Mars transportation. At projected $100/kg to Mars surface costs, the primary expense shifts from launch to surface infrastructure. Our economic models suggest a minimum viable colony of 100 people requires approximately $50-80B in total investment.",
        "Radiation exposure remains the most significant health risk. Our agents cross-referenced 340 radiobiology studies and concluded that regolith-shielded habitats combined with pharmaceutical radioprotectors can reduce cancer risk to acceptable levels for 2-year surface stays.",
        "Psychological factors are under-studied. Only 12 long-duration isolation studies exceed 180 days with crews larger than 6. MEEET agents recommend establishing a 500-day analog habitat on Earth before committing to permanent settlement missions.",
      ],
      sourceCount: 73,
      tags: ["cross-validated", "multi-disciplinary", "moderate-confidence"],
    },
    {
      title: "Asteroid Mining Economic Viability",
      confidence: 75,
      paragraphs: [
        "Analysis of 16,000+ catalogued near-Earth asteroids reveals that approximately 1,500 are potentially profitable mining targets, with estimated individual resource values ranging from $1B to $25T for platinum-group metals alone.",
        "The economic case has improved dramatically with reusable launch vehicles. Our cost models show that a robotic asteroid mining mission could break even at current commodity prices if launch costs remain below $500/kg to LEO — a threshold already achieved by SpaceX.",
        "Key uncertainty: Space resource property rights remain legally ambiguous despite the 2015 U.S. Commercial Space Launch Competitiveness Act. International consensus through the Artemis Accords is progressing but incomplete, creating investment risk.",
      ],
      sourceCount: 35,
      tags: ["economic-model", "projection", "moderate-confidence"],
    },
    {
      title: "Space Elevator Engineering Assessment",
      confidence: 68,
      paragraphs: [
        "Carbon nanotube (CNT) technology remains the critical bottleneck for space elevator construction. Current CNT production achieves tensile strengths of 50 GPa in laboratory conditions — approximately 50% of the minimum required for a geostationary tether.",
        "Our materials science agents analyzed 780 publications and identified boron nitride nanotube (BNNT) composites as a promising alternative, with theoretical strength-to-weight ratios 15% superior to CNTs, though manufacturing scalability remains unproven.",
        "Alternative concepts including lunar space elevators (requiring only existing material strengths) and partial space elevators (reducing tether requirements by 80%) offer intermediate stepping stones that could prove commercially viable within 20-30 years.",
        "Conservative assessment: A full Earth-based space elevator is unlikely before 2060. However, related technologies — including momentum exchange tethers and rotovators — could achieve 90% of the cost reduction benefits within 15 years.",
      ],
      sourceCount: 42,
      tags: ["materials-science", "theoretical", "low-confidence"],
    },
  ],
  defi: [
    {
      title: "Solana DeFi Ecosystem Sustainability Analysis",
      confidence: 86,
      paragraphs: [
        "Our on-chain analysis of 14 months of Solana DeFi activity reveals a maturing ecosystem with declining dependence on incentive farming. Organic trading volume now accounts for 67% of total DEX activity, up from 23% two years ago, indicating genuine product-market fit.",
        "Transaction cost efficiency remains Solana's primary competitive moat. At $0.00025 average transaction cost, Solana DeFi protocols achieve 10-100x cost advantages over Ethereum L1, making micro-transactions and high-frequency strategies economically viable.",
        "Risk factors include validator concentration (top 19 validators control 33% of stake) and periodic network congestion during high-demand events. The QUIC protocol upgrade and local fee markets have reduced outage incidents by 78% year-over-year.",
        "Our agents project Solana DeFi TVL will reach $15-25B by end of 2026, driven by institutional adoption of tokenized real-world assets (RWAs) and the growing AI-agent economy that MEEET represents.",
      ],
      sourceCount: 58,
      tags: ["on-chain-data", "cross-validated", "high-confidence"],
    },
    {
      title: "AI Agents as Autonomous Fund Managers",
      confidence: 81,
      paragraphs: [
        "Analysis of 340 algorithmic trading studies shows that AI-driven portfolio management consistently outperforms passive indices by 3-7% annually when properly calibrated, though it trails top-quartile human fund managers in tail-risk scenarios.",
        "MEEET-style multi-agent systems offer a paradigm shift: instead of single-model predictions, networks of specialized agents (macro analysis, sentiment, technical, on-chain) achieve ensemble accuracy 22% higher than monolithic AI models.",
        "Regulatory landscape is evolving. SEC and MAS guidance suggests AI-managed funds will require human oversight 'kill switches' and explainability requirements. MEEET's transparent agent audit trail positions it favorably for regulatory compliance.",
      ],
      sourceCount: 47,
      tags: ["quantitative-analysis", "cross-validated", "moderate-confidence"],
    },
    {
      title: "Decentralized Insurance Protocol Assessment",
      confidence: 77,
      paragraphs: [
        "Our analysis of 12 decentralized insurance protocols reveals that parametric insurance (automated payouts triggered by verifiable events) is the most viable DeFi insurance model, achieving 94% claim processing accuracy versus 71% for discretionary models.",
        "Total addressable market for DeFi insurance is estimated at $8.2B by 2027, with smart contract coverage, stablecoin de-peg protection, and real-world parametric weather insurance as the three fastest-growing segments.",
        "Key innovation opportunity: AI agents acting as underwriters can price risk 3x faster than traditional actuarial methods, with early data suggesting comparable accuracy. MEEET's oracle network could serve as a trust layer for claim verification.",
        "Challenge: Capital efficiency remains low — most protocols require 300-500% collateralization. Hybrid models combining DeFi liquidity pools with traditional reinsurance backing offer the most promising path to sustainable scaling.",
      ],
      sourceCount: 33,
      tags: ["market-analysis", "cross-validated", "moderate-confidence"],
    },
  ],
  climate: [
    {
      title: "Carbon Capture Technology Scalability Assessment",
      confidence: 84,
      paragraphs: [
        "Our analysis of 1,800 climate science and engineering publications reveals that direct air capture (DAC) technology has achieved a 60% cost reduction since 2020, with leading facilities now capturing CO2 at $250-400/ton — approaching the $100/ton threshold needed for climate-relevant scale.",
        "Point-source carbon capture at industrial facilities is already economically viable in several sectors. Cement and steel plants can implement capture systems with payback periods under 7 years when carbon credits are priced above $80/ton, a threshold now exceeded in the EU ETS.",
        "Storage capacity is not a constraint. Geological surveys identify over 8,000 gigatons of CO2 storage capacity in saline aquifers and depleted hydrocarbon reservoirs globally — sufficient for centuries of industrial emissions at current rates.",
        "Critical path: Scaling DAC to climate-relevant levels (10 GT/year) requires a 10,000x capacity increase from current levels. Our agents model this as achievable by 2050-2060 with sustained 25% annual growth rates, comparable to solar PV's historical scaling trajectory.",
      ],
      sourceCount: 71,
      tags: ["peer-reviewed", "multi-source", "high-confidence"],
    },
    {
      title: "Optimal Reforestation Strategy Analysis",
      confidence: 88,
      paragraphs: [
        "Cross-referencing satellite data, ecological studies, and economic models across 89 countries, our agents conclude that natural regeneration outperforms plantation forestry for carbon sequestration by 40% over 30-year horizons, while costing 80% less per hectare.",
        "The most impactful reforestation zones identified by our network include the Atlantic Forest (Brazil), the Congo Basin buffer zones, and degraded mangrove ecosystems in Southeast Asia. These regions offer the highest carbon-to-cost ratios while maximizing biodiversity co-benefits.",
        "Emerging approach: 'Assisted natural regeneration' — combining seed dispersal, invasive species removal, and community stewardship — achieves 85% of old-growth forest carbon density within 25 years at one-tenth the cost of traditional tree planting programs.",
      ],
      sourceCount: 63,
      tags: ["satellite-data", "peer-reviewed", "high-confidence"],
    },
    {
      title: "Ocean Cleanup Technology Global Scalability",
      confidence: 79,
      paragraphs: [
        "Analysis of 940 marine science publications and 15 ocean cleanup pilot projects reveals that river interception systems are 8x more cost-effective than open-ocean cleanup for reducing marine plastic pollution, preventing debris before it reaches ocean gyres.",
        "Current technologies can address only macro-plastics (>5mm). Microplastic removal from open water remains technically and economically unfeasible at scale. Our agents identified 23 promising bioremediation approaches using engineered enzymes (PETase variants) that could address microplastic degradation within 10-15 years.",
        "Economic model: A global network of 1,000 river interception systems at the world's most polluting rivers could capture 80% of river-borne plastic entering oceans, at an estimated cost of $2.5B annually — approximately $0.30 per person globally.",
        "Complementary strategy: Reducing plastic production through policy interventions (extended producer responsibility, deposit-return schemes) achieves 3x the impact per dollar invested compared to cleanup technologies alone.",
      ],
      sourceCount: 49,
      tags: ["cross-validated", "environmental-data", "moderate-confidence"],
    },
  ],
};

export function getAnalysisForDomain(domain: PlaygroundDomain, question: string): PlaygroundTemplate {
  const domainTemplates = templates[domain];
  // Simple keyword matching to pick the most relevant template
  const lower = question.toLowerCase();
  let best = 0;
  let bestScore = 0;
  domainTemplates.forEach((t, i) => {
    const words = t.title.toLowerCase().split(/\s+/);
    const score = words.filter(w => w.length > 3 && lower.includes(w)).length;
    if (score > bestScore) { bestScore = score; best = i; }
  });
  // If no keyword match, pick randomly based on question length as seed
  if (bestScore === 0) {
    best = question.length % domainTemplates.length;
  }
  const template = domainTemplates[best];
  // Interpolate user question into first paragraph
  const interpolated = { ...template, paragraphs: [...template.paragraphs] };
  interpolated.paragraphs[0] = interpolated.paragraphs[0].replace(
    /Our analysis/,
    `Regarding "${question.slice(0, 80)}${question.length > 80 ? "…" : ""}" — our analysis`
  );
  return interpolated;
}

export default templates;
