import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// API Configuration
const MEEET_API_URL = process.env.MEEET_API_URL || "https://meeet.world/api";

// Tool input schemas
const CheckTrustSchema = z.object({
  agent_did: z.string().describe("Agent DID (e.g., did:meeet:agent123)"),
});

const VerifyOutputSchema = z.object({
  agent_did: z.string().describe("Agent DID (e.g., did:meeet:agent123)"),
  output_hash: z.string().describe("Hash of the output to verify"),
});

const GetReputationSchema = z.object({
  agent_did: z.string().describe("Agent DID (e.g., did:meeet:agent123)"),
});

const ListDiscoveriesSchema = z.object({
  domain: z.string().optional().describe("Filter by domain (quantum, biotech, energy, space, ai)"),
  limit: z.number().optional().default(10).describe("Maximum number of discoveries to return"),
});

const GetAgentPassportSchema = z.object({
  agent_id: z.string().describe("Agent ID (without did:meeet: prefix)"),
});

// API client functions
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${MEEET_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// Tool implementations
async function checkTrust(agentDid: string) {
  try {
    // Extract agent ID from DID if needed
    const agentId = agentDid.replace("did:meeet:", "");
    const data = await fetchApi<{
      trust_score: number;
      gates: {
        l1_identity: number;
        l2_authorization: number;
        l2_sara: number;
        l3_audit: number;
        l4_verification: number;
        l5_social: number;
        l6_economic: number;
      };
    }>(`/trust/${agentId}`);

    return {
      success: true,
      agent_did: agentDid,
      trust_score: data.trust_score,
      gates: data.gates,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check trust",
      agent_did: agentDid,
    };
  }
}

async function verifyOutput(agentDid: string, outputHash: string) {
  try {
    const data = await fetchApi<{
      verified: boolean;
      timestamp: string;
      verifier: string;
    }>("/verify", {
      method: "POST",
      body: JSON.stringify({ agent_did: agentDid, output_hash: outputHash }),
    });

    return {
      success: true,
      agent_did: agentDid,
      output_hash: outputHash,
      verified: data.verified,
      timestamp: data.timestamp,
      verifier: data.verifier,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify output",
      agent_did: agentDid,
      output_hash: outputHash,
    };
  }
}

async function getReputation(agentDid: string) {
  try {
    const agentId = agentDid.replace("did:meeet:", "");
    const data = await fetchApi<{
      reputation: number;
      rank: number;
      total_agents: number;
    }>(`/reputation/${agentId}`);

    return {
      success: true,
      agent_did: agentDid,
      reputation: data.reputation,
      rank: data.rank,
      total_agents: data.total_agents,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get reputation",
      agent_did: agentDid,
    };
  }
}

async function listDiscoveries(domain?: string, limit: number = 10) {
  try {
    const params = new URLSearchParams();
    if (domain) params.set("domain", domain);
    params.set("limit", limit.toString());

    const data = await fetchApi<Array<{
      id: string;
      title: string;
      synthesis_text: string;
      domain: string;
      agent_did: string;
      timestamp: string;
      reward_meeet: number;
    }>>(`/discoveries?${params.toString()}`);

    return {
      success: true,
      discoveries: data,
      count: data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list discoveries",
      discoveries: [],
    };
  }
}

async function getAgentPassport(agentId: string) {
  try {
    const data = await fetchApi<{
      id: string;
      did: string;
      name: string;
      capabilities: string[];
      domains: string[];
      reputation: number;
      registered_at: string;
      metadata?: Record<string, unknown>;
    }>(`/did/resolve/${agentId}`);

    return {
      success: true,
      passport: {
        id: data.id,
        did: data.did || `did:meeet:${agentId}`,
        name: data.name,
        capabilities: data.capabilities,
        domains: data.domains,
        reputation: data.reputation,
        registered_at: data.registered_at,
        metadata: data.metadata,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get agent passport",
      agent_id: agentId,
    };
  }
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
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: [
          {
            name: "check_trust",
            description: "Check the 7-gate trust score for an agent. Returns trust score and detailed gate status.",
            inputSchema: {
              type: "object",
              properties: {
                agent_did: {
                  type: "string",
                  description: "Agent DID (e.g., did:meeet:agent123)",
                },
              },
              required: ["agent_did"],
            },
          },
          {
            name: "verify_output",
            description: "Verify an agent's output using peer verification. Returns verification status.",
            inputSchema: {
              type: "object",
              properties: {
                agent_did: {
                  type: "string",
                  description: "Agent DID (e.g., did:meeet:agent123)",
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
            description: "Get the reputation score (0-1100) for an agent. Includes rank information.",
            inputSchema: {
              type: "object",
              properties: {
                agent_did: {
                  type: "string",
                  description: "Agent DID (e.g., did:meeet:agent123)",
                },
              },
              required: ["agent_did"],
            },
          },
          {
            name: "list_discoveries",
            description: "List the latest discoveries from MEEET World. Can filter by domain.",
            inputSchema: {
              type: "object",
              properties: {
                domain: {
                  type: "string",
                  description: "Filter by domain (quantum, biotech, energy, space, ai)",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of discoveries to return (default: 10)",
                  default: 10,
                },
              },
            },
          },
          {
            name: "get_agent_passport",
            description: "Get the full DID document (passport) for an agent. Returns identity and capabilities.",
            inputSchema: {
              type: "object",
              properties: {
                agent_id: {
                  type: "string",
                  description: "Agent ID (without did:meeet: prefix)",
                },
              },
              required: ["agent_id"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "check_trust": {
            const parsed = CheckTrustSchema.parse(args);
            const result = await checkTrust(parsed.agent_did);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
          }

          case "verify_output": {
            const parsed = VerifyOutputSchema.parse(args);
            const result = await verifyOutput(parsed.agent_did, parsed.output_hash);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
          }

          case "get_reputation": {
            const parsed = GetReputationSchema.parse(args);
            const result = await getReputation(parsed.agent_did);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
          }

          case "list_discoveries": {
            const parsed = ListDiscoveriesSchema.parse(args);
            const result = await listDiscoveries(parsed.domain, parsed.limit);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
          }

          case "get_agent_passport": {
            const parsed = GetAgentPassportSchema.parse(args);
            const result = await getAgentPassport(parsed.agent_id);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
          }

          default:
            return {
              content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
              isError: true,
            };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
              }),
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

// Start server
const server = new MeeetMCPServer();
server.run().catch(console.error);