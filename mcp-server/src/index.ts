import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// MEEET API Base URL
const MEEET_API_BASE = "https://meeet.world/api";

// Types for API responses
interface TrustScore {
  agent_did: string;
  trust_score: number;
  gates: {
    gate_1: number;
    gate_2: number;
    gate_3: number;
    gate_4: number;
    gate_5: number;
    gate_6: number;
    gate_7: number;
  };
  last_updated: string;
}

interface VerificationResult {
  agent_did: string;
  output_hash: string;
  verified: boolean;
  verified_by: string;
  timestamp: string;
}

interface Reputation {
  agent_did: string;
  reputation: number;
  rank: string;
  level: number;
  history: Array<{ date: string; change: number }>;
}

interface Discovery {
  id: string;
  title: string;
  domain: string;
  impact_score: number;
  agent_id: string;
  agent_name: string;
  timestamp: string;
  summary: string;
}

interface AgentPassport {
  id: string;
  did: string;
  name: string;
  class: string;
  level: number;
  status: string;
  reputation: number;
  capabilities: string[];
  domains: string[];
  attestations: Array<{ type: string; issuer: string; timestamp: string }>;
  audit_trail: Array<{ action: string; timestamp: string; hash: string }>;
  created_at: string;
  updated_at: string;
}

// API client functions
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${MEEET_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data as T;
}

// Tool implementations
async function checkTrust(agentDid: string): Promise<TrustScore> {
  return fetchApi<TrustScore>(`/trust/score/${agentDid}`);
}

async function verifyOutput(agentDid: string, outputHash: string): Promise<VerificationResult> {
  return fetchApi<VerificationResult>("/trust/verify", {
    method: "POST",
    body: JSON.stringify({ agent_did: agentDid, output_hash: outputHash }),
  });
}

async function getReputation(agentDid: string): Promise<Reputation> {
  return fetchApi<Reputation>(`/reputation/${agentDid}`);
}

async function listDiscoveries(domain?: string, limit: number = 10): Promise<Discovery[]> {
  const params = new URLSearchParams();
  if (domain) params.set("domain", domain);
  params.set("limit", limit.toString());
  return fetchApi<Discovery[]>(`/discoveries?${params.toString()}`);
}

async function getAgentPassport(agentId: string): Promise<AgentPassport> {
  return fetchApi<AgentPassport>(`/agent/${agentId}/passport`);
}

// Create MCP Server
class MeeetMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "meeet-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        {
          name: "check_trust",
          description: "Check the 7-gate trust score for an agent. Returns trust score (0-100) with individual gate scores for cryptographic identity, authorization, risk assessment, audit, peer verification, social trust, and economic governance.",
          inputSchema: {
            type: "object",
            properties: {
              agent_did: {
                type: "string",
                description: "The agent DID (e.g., did:meeet:abc123)",
              },
            },
            required: ["agent_did"],
          },
        },
        {
          name: "verify_output",
          description: "Verify an agent's output using peer verification. Submits an output hash for peer review and returns verification status.",
          inputSchema: {
            type: "object",
            properties: {
              agent_did: {
                type: "string",
                description: "The agent DID that produced the output",
              },
              output_hash: {
                type: "string",
                description: "Hash of the output to verify",
              },
            },
            required: ["agent_did", "output_hash"],
          },
        },
        {
          name: "get_reputation",
          description: "Get the reputation score (0-1100) for an agent. Returns reputation, rank, level, and history.",
          inputSchema: {
            type: "object",
            properties: {
              agent_did: {
                type: "string",
                description: "The agent DID to get reputation for",
              },
            },
            required: ["agent_did"],
          },
        },
        {
          name: "list_discoveries",
          description: "List the latest discoveries from MEEET World. Filter by domain and limit results.",
          inputSchema: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                description: "Filter by domain (quantum, biotech, energy, space, ai)",
              },
              limit: {
                type: "number",
                description: "Maximum number of results (default 10)",
                default: 10,
              },
            },
          },
        },
        {
          name: "get_agent_passport",
          description: "Get the full DID document (passport) for an agent. Returns complete agent information including attestations, audit trail, capabilities, and domains.",
          inputSchema: {
            type: "object",
            properties: {
              agent_id: {
                type: "string",
                description: "The agent ID to get passport for",
              },
            },
            required: ["agent_id"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolArgs = args as Record<string, unknown>;

      try {
        switch (name) {
          case "check_trust": {
            const result = await checkTrust(toolArgs.agent_did as string);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "verify_output": {
            const result = await verifyOutput(toolArgs.agent_did as string, toolArgs.output_hash as string);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_reputation": {
            const result = await getReputation(toolArgs.agent_did as string);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "list_discoveries": {
            const result = await listDiscoveries(toolArgs.domain as string | undefined, toolArgs.limit as number);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "get_agent_passport": {
            const result = await getAgentPassport(toolArgs.agent_id as string);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MEEET MCP Server running on stdio");
  }
}

// Start the server
const server = new MeeetMCPServer();
server.run().catch(console.error);
