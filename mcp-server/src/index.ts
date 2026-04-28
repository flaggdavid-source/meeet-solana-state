/**
 * MEEET MCP Server
 * 
 * An MCP (Model Context Protocol) server that exposes MEEET World API endpoints
 * to Claude, GPT, and other LLMs.
 * 
 * Endpoints wrapped:
 * - GET  /api/did/resolve/:agentId    → resolve DID
 * - GET  /api/discoveries             → get discoveries
 * - POST /api/verify/output           → verify output
 * - GET  /api/reputation/:agentId     → get reputation
 * - POST /api/sara/assess             → assess risk (SARA)
 * - GET  /api/staking/stats           → staking stats
 * - GET  /api/interactions/graph      → interactions graph
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ============== Configuration ==============

const MEEET_API_BASE = process.env.MEEET_API_BASE || "https://meeet.world/api";
const MEEET_API_KEY = process.env.MEEET_API_KEY || "";

// ============== Types ==============

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface DIDDocument {
  id: string;
  "@context": string | string[];
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
  }>;
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

interface Discovery {
  id: string;
  title: string;
  synthesis_text: string;
  domain: string;
  submitted_by: string;
  created_at: string;
  verified: boolean;
}

interface Reputation {
  agent_id: string;
  score: number;
  rank: number;
  total_verifications: number;
  trust_level: string;
}

interface SARAAssessment {
  agent_id: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high";
  factors: string[];
  recommendation: string;
  assessed_at: string;
}

interface StakingStats {
  total_staked: number;
  total_delegators: number;
  top_staked_agents: Array<{
    agent_id: string;
    staked_amount: number;
    delegators_count: number;
  }>;
}

interface InteractionsGraph {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

// ============== API Client ==============

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${MEEET_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(MEEET_API_KEY && { Authorization: `Bearer ${MEEET_API_KEY}` }),
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      return { error: `API error: ${response.status} ${response.statusText}` };
    }

    const data = await response.json() as T;
    return { data };
  } catch (error) {
    return { error: `Request failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

// ============== Tool Handlers ==============

// Tool: resolve DID
const ResolveDIDSchema = z.object({
  agentId: z.string().describe("The agent ID to resolve DID for"),
});

async function resolveDID(args: z.infer<typeof ResolveDIDSchema>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { agentId } = args;
  const result = await apiCall<DIDDocument>(`/did/resolve/${encodeURIComponent(agentId)}`);

  if (result.error) {
    return {
      content: [{ type: "text", text: `Error resolving DID: ${result.error}` }],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
  };
}

// Tool: get discoveries
const GetDiscoveriesSchema = z.object({
  limit: z.number().optional().default(20).describe("Maximum number of discoveries to return"),
  domain: z.string().optional().describe("Filter by domain"),
  verified: z.boolean().optional().describe("Filter by verification status"),
});

async function getDiscoveries(args: z.infer<typeof GetDiscoveriesSchema>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { limit, domain, verified } = args;
  
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  if (domain) params.append("domain", domain);
  if (verified !== undefined) params.append("verified", String(verified));

  const result = await apiCall<Discovery[]>(`/discoveries?${params}`);

  if (result.error) {
    return {
      content: [{ type: "text", text: `Error fetching discoveries: ${result.error}` }],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
  };
}

// Tool: verify output
const VerifyOutputSchema = z.object({
  discoveryId: z.string().describe("The discovery ID to verify"),
  output: z.string().describe("The output to verify"),
  verifierAgentId: z.string().describe("The agent performing verification"),
});

async function verifyOutput(args: z.infer<typeof VerifyOutputSchema>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { discoveryId, output, verifierAgentId } = args;
  
  const result = await apiCall<{ verified: boolean; confidence: number; details: string }>("/verify/output", {
    method: "POST",
    body: JSON.stringify({ discovery_id: discoveryId, output, verifier_agent_id: verifierAgentId }),
  });

  if (result.error) {
    return {
      content: [{ type: "text", text: `Error verifying output: ${result.error}` }],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
  };
}

// Tool: get reputation
const GetReputationSchema = z.object({
  agentId: z.string().describe("The agent ID to get reputation for"),
});

async function getReputation(args: z.infer<typeof GetReputationSchema>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { agentId } = args;
  const result = await apiCall<Reputation>(`/reputation/${encodeURIComponent(agentId)}`);

  if (result.error) {
    return {
      content: [{ type: "text", text: `Error fetching reputation: ${result.error}` }],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
  };
}

// Tool: SARA risk assessment
const AssessRiskSchema = z.object({
  agentId: z.string().describe("The agent ID to assess"),
  context: z.string().optional().describe("Additional context for assessment"),
  action: z.string().optional().describe("The action being assessed"),
});

async function assessRisk(args: z.infer<typeof AssessRiskSchema>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { agentId, context, action } = args;
  
  const result = await apiCall<SARAAssessment>("/sara/assess", {
    method: "POST",
    body: JSON.stringify({ agent_id: agentId, context, action }),
  });

  if (result.error) {
    return {
      content: [{ type: "text", text: `Error assessing risk: ${result.error}` }],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
  };
}

// Tool: get staking stats
const GetStakingStatsSchema = z.object({
  period: z.enum(["24h", "7d", "30d", "all"]).optional().default("7d").describe("Time period for stats"),
});

async function getStakingStats(args: z.infer<typeof GetStakingStatsSchema>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { period } = args;
  const result = await apiCall<StakingStats>(`/staking/stats?period=${period}`);

  if (result.error) {
    return {
      content: [{ type: "text", text: `Error fetching staking stats: ${result.error}` }],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
  };
}

// Tool: get interactions graph
const GetInteractionsGraphSchema = z.object({
  agentId: z.string().optional().describe("Filter by agent ID"),
  depth: z.number().optional().default(2).describe("Graph depth"),
});

async function getInteractionsGraph(args: z.infer<typeof GetInteractionsGraphSchema>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { agentId, depth } = args;
  
  const params = new URLSearchParams();
  params.append("depth", String(depth));
  if (agentId) params.append("agent_id", agentId);

  const result = await apiCall<InteractionsGraph>(`/interactions/graph?${params}`);

  if (result.error) {
    return {
      content: [{ type: "text", text: `Error fetching interactions graph: ${result.error}` }],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
  };
}

// ============== Resource Handlers ==============

// Resource: agent passport
async function getAgentPassport(agentId: string): Promise<string> {
  const [didResult, reputationResult, stakingResult] = await Promise.all([
    apiCall<DIDDocument>(`/did/resolve/${encodeURIComponent(agentId)}`),
    apiCall<Reputation>(`/reputation/${encodeURIComponent(agentId)}`),
    apiCall<{ staked: number; delegators: number }>(`/staking/agent/${encodeURIComponent(agentId)}`),
  ]);

  const passport = {
    agent_id: agentId,
    did_document: didResult.data,
    reputation: reputationResult.data,
    staking: stakingResult.data,
    generated_at: new Date().toISOString(),
  };

  return JSON.stringify(passport, null, 2);
}

// Resource: leaderboard
async function getLeaderboard(): Promise<string> {
  const result = await apiCall<Reputation[]>("/reputation/leaderboard");
  
  if (result.error) {
    return JSON.stringify({ error: result.error });
  }

  return JSON.stringify(result.data, null, 2);
}

// Resource: live stats
async function getLiveStats(): Promise<string> {
  const [stakingStats, recentDiscoveries] = await Promise.all([
    apiCall<StakingStats>("/staking/stats"),
    apiCall<Discovery[]>("/discoveries?limit=10"),
  ]);

  const stats = {
    staking: stakingStats.data,
    recent_discoveries_count: recentDiscoveries.data?.length || 0,
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(stats, null, 2);
}

// ============== Prompt Templates ==============

const prompts = {
  createAgent: `You are helping create a new MEEET agent. 

To create an agent, you need to provide:
1. **name**: A unique, descriptive name for the agent
2. **agentClass**: The type of agent (oracle, verifier, delegator, researcher, etc.)
3. **description**: What the agent does and its capabilities
4. **framework**: The AI framework being used (e.g., openai, anthropic, custom)

Ask the user for these details, then help them register the agent using the MeeetAgent SDK.

Example:
\`\`\`javascript
const { MeeetAgent } = require('@meeet/sdk');
const agent = await MeeetAgent.register("MyBot", "oracle", { 
  description: "AI agent that finds novel patterns" 
});
\`\`\``,

  verifyDiscovery: `You are helping verify a discovery on MEEET World.

To verify a discovery:
1. Get the discovery details using the get_discoveries tool
2. Review the synthesis_text and domain
3. Use verify_output tool to submit verification with:
   - discoveryId: The discovery ID
   - output: Your verification assessment
   - verifierAgentId: Your agent ID

The verification should include:
- Whether the discovery is valid
- Confidence level (0-100)
- Any concerns or issues found`,

  startDebate: `You are facilitating a debate between MEEET agents.

To start a debate:
1. Identify the agents involved (use resolve_did to get their details)
2. Define the topic/question to debate
3. Set clear rules and criteria for evaluation
4. Use the chat function to facilitate discussion

Use get_reputation to understand each agent's credibility, and consider using sara_assess to evaluate any risks.

Remember to stay neutral and focus on the quality of arguments!`,
};

// ============== MCP Server Setup ==============

const server = new Server(
  {
    name: "meeet-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: [
      {
        name: "resolve_did",
        description: "Resolve a DID to get the agent's DID document with verification methods and service endpoints",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "The agent ID to resolve DID for" },
          },
          required: ["agentId"],
        },
      },
      {
        name: "get_discoveries",
        description: "Get a list of discoveries with optional filtering by domain and verification status",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Maximum number of discoveries to return", default: 20 },
            domain: { type: "string", description: "Filter by domain" },
            verified: { type: "boolean", description: "Filter by verification status" },
          },
        },
      },
      {
        name: "verify_output",
        description: "Verify a discovery output and submit verification results",
        inputSchema: {
          type: "object",
          properties: {
            discoveryId: { type: "string", description: "The discovery ID to verify" },
            output: { type: "string", description: "The output to verify" },
            verifierAgentId: { type: "string", description: "The agent performing verification" },
          },
          required: ["discoveryId", "output", "verifierAgentId"],
        },
      },
      {
        name: "get_reputation",
        description: "Get an agent's reputation score, rank, and trust level",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "The agent ID to get reputation for" },
          },
          required: ["agentId"],
        },
      },
      {
        name: "assess_risk",
        description: "Run a SARA (Security and Risk Assessment) on an agent",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "The agent ID to assess" },
            context: { type: "string", description: "Additional context for assessment" },
            action: { type: "string", description: "The action being assessed" },
          },
          required: ["agentId"],
        },
      },
      {
        name: "get_staking_stats",
        description: "Get staking statistics including total staked and top staked agents",
        inputSchema: {
          type: "object",
          properties: {
            period: { 
              type: "string", 
              enum: ["24h", "7d", "30d", "all"],
              description: "Time period for stats",
              default: "7d"
            },
          },
        },
      },
      {
        name: "get_interactions_graph",
        description: "Get the social graph of agent interactions",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "Filter by agent ID" },
            depth: { type: "number", description: "Graph depth", default: 2 },
          },
        },
      },
    ],
  };
});

// Register resources
server.setRequestHandler(ListResourcesRequestSchema, () => {
  return {
    resources: [
      {
        uri: "meeet://agent-passport/{agentId}",
        name: "Agent Passport",
        description: "Complete passport for an agent including DID, reputation, and staking info",
        mimeType: "application/json",
      },
      {
        uri: "meeet://leaderboard",
        name: "Reputation Leaderboard",
        description: "Top agents ranked by reputation score",
        mimeType: "application/json",
      },
      {
        uri: "meeet://live-stats",
        name: "Live Statistics",
        description: "Current staking stats and recent discoveries count",
        mimeType: "application/json",
      },
    ],
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === "meeet://leaderboard") {
    const data = await getLeaderboard();
    return { contents: [{ uri, mimeType: "application/json", text: data }] };
  }

  if (uri === "meeet://live-stats") {
    const data = await getLiveStats();
    return { contents: [{ uri, mimeType: "application/json", text: data }] };
  }

  if (uri.startsWith("meeet://agent-passport/")) {
    const agentId = uri.replace("meeet://agent-passport/", "");
    const data = await getAgentPassport(agentId);
    return { contents: [{ uri, mimeType: "application/json", text: data }] };
  }

  return { contents: [{ uri, mimeType: "text/plain", text: "Unknown resource" }] };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "resolve_did":
      return resolveDID(ResolveDIDSchema.parse(args));
    case "get_discoveries":
      return getDiscoveries(GetDiscoveriesSchema.parse(args));
    case "verify_output":
      return verifyOutput(VerifyOutputSchema.parse(args));
    case "get_reputation":
      return getReputation(GetReputationSchema.parse(args));
    case "assess_risk":
      return assessRisk(AssessRiskSchema.parse(args));
    case "get_staking_stats":
      return getStakingStats(GetStakingStatsSchema.parse(args));
    case "get_interactions_graph":
      return getInteractionsGraph(GetInteractionsGraphSchema.parse(args));
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// ============== Server Startup ==============

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MEEET MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
