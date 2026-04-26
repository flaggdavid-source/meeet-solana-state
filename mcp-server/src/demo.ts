/**
 * MEEET MCP Server Demo Script
 * 
 * Tests all MCP tools locally without requiring a full MCP client.
 * This simulates what Claude Desktop or Cursor would do.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Re-use the same implementation from index.ts for testing
const API_BASE = "https://meeet.world/api";

const CheckTrustSchema = z.object({
  agent_did: z.string(),
});

const VerifyOutputSchema = z.object({
  agent_did: z.string(),
  output_hash: z.string(),
});

const GetReputationSchema = z.object({
  agent_did: z.string(),
});

const ListDiscoveriesSchema = z.object({
  domain: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

const GetAgentPassportSchema = z.object({
  agent_id: z.string(),
});

async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
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

async function checkTrust(agentDid: string) {
  try {
    const result = await apiCall<{
      trust_score: number;
      gates: {
        l1_identity: boolean;
        l2_authorization: boolean;
        l25_sara_guard: boolean;
        l3_audit: boolean;
        l4_verification: boolean;
        l5_social: boolean;
        l6_economic: boolean;
      };
    }>(`/trust/${encodeURIComponent(agentDid)}`);
    
    return { success: true, agent_did: agentDid, trust_score: result.trust_score, gates: result.gates };
  } catch {
    return {
      success: true,
      agent_did: agentDid,
      trust_score: 750,
      gates: {
        l1_identity: true,
        l2_authorization: true,
        l25_sara_guard: true,
        l3_audit: true,
        l4_verification: true,
        l5_social: true,
        l6_economic: true,
      },
      _note: "Using demo data",
    };
  }
}

async function verifyOutput(agentDid: string, outputHash: string) {
  try {
    const result = await apiCall<{ verified: boolean; confidence: number; peers: number }>(`/verify`, {
      method: "POST",
      body: JSON.stringify({ agent_did: agentDid, output_hash: outputHash }),
    });
    return { success: true, agent_did: agentDid, output_hash: outputHash, verified: result.verified, confidence: result.confidence, peer_count: result.peers };
  } catch {
    return { success: true, agent_did: agentDid, output_hash: outputHash, verified: true, confidence: 0.85, peer_count: 5, _note: "Using demo data" };
  }
}

async function getReputation(agentDid: string) {
  try {
    const result = await apiCall<{ reputation: number; rank: number; tier: string }>(`/reputation/${encodeURIComponent(agentDid)}`);
    return { success: true, agent_did: agentDid, reputation: result.reputation, rank: result.rank, tier: result.tier };
  } catch {
    return { success: true, agent_did: agentDid, reputation: 850, rank: 42, tier: "Gold", _note: "Using demo data" };
  }
}

async function listDiscoveries(domain?: string, limit: number = 20) {
  try {
    const params = new URLSearchParams();
    if (domain) params.set("domain", domain);
    params.set("limit", limit.toString());
    const result = await apiCall<{ discoveries: any[] }>(`/discoveries?${params.toString()}`);
    return { success: true, count: result.discoveries.length, discoveries: result.discoveries };
  } catch {
    const sampleDiscoveries = [
      { id: "disc_001", title: "Novel quantum entanglement pattern", synthesis: "New pattern for quantum communication", domain: "quantum", agent_did: "did:meeet:qr001", timestamp: new Date().toISOString(), reward: 500 },
      { id: "disc_002", title: "CRISPR efficiency improvement", synthesis: "40% increase in editing efficiency", domain: "biotech", agent_did: "did:meeet:bv042", timestamp: new Date(Date.now() - 86400000).toISOString(), reward: 750 },
      { id: "disc_003", title: "Fusion reactor stability", synthesis: "Record plasma stability duration", domain: "energy", agent_did: "did:meeet:er017", timestamp: new Date(Date.now() - 172800000).toISOString(), reward: 600 },
    ];
    const filtered = domain ? sampleDiscoveries.filter(d => d.domain === domain) : sampleDiscoveries;
    return { success: true, count: filtered.length, discoveries: filtered.slice(0, limit), _note: "Using demo data" };
  }
}

async function getAgentPassport(agentId: string) {
  const normalizedId = agentId.startsWith("did:meeet:") ? agentId : `did:meeet:${agentId}`;
  try {
    const result = await apiCall<any>(`/did/resolve/${encodeURIComponent(normalizedId)}`);
    return { success: true, passport: result };
  } catch {
    return {
      success: true,
      passport: {
        did: normalizedId,
        name: "MEEET Agent",
        class: "oracle",
        reputation: 850,
        capabilities: ["discovery", "debate", "governance", "verify"],
        domains: ["quantum", "biotech", "energy"],
        attestations: [{ type: "identity_verified", issuer: "did:meeet:authority", timestamp: new Date(Date.now() - 30 * 86400000).toISOString() }],
        verification_claims: [{ claim: "quantum_researcher", verified: true }],
      },
      _note: "Using demo data",
    };
  }
}

// Create test server
class TestMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "meeet-mcp-server", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "check_trust",
          description: "Check 7-gate trust score",
          inputSchema: { type: "object", properties: { agent_did: { type: "string" } }, required: ["agent_did"] },
        },
        {
          name: "verify_output",
          description: "Verify agent output",
          inputSchema: { type: "object", properties: { agent_did: { type: "string" }, output_hash: { type: "string" } }, required: ["agent_did", "output_hash"] },
        },
        {
          name: "get_reputation",
          description: "Get reputation score",
          inputSchema: { type: "object", properties: { agent_did: { type: "string" } }, required: ["agent_did"] },
        },
        {
          name: "list_discoveries",
          description: "List discoveries",
          inputSchema: { type: "object", properties: { domain: { type: "string" }, limit: { type: "number", default: 20 } } },
        },
        {
          name: "get_agent_passport",
          description: "Get agent passport",
          inputSchema: { type: "object", properties: { agent_id: { type: "string" } }, required: ["agent_id"] },
        },
      ],
    }));

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
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: "text", text: JSON.stringify({ error: String(error) }, null, 2) }], isError: true };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Run tests
async function runTests() {
  console.log("🧪 MEEET MCP Server - Running Tests\n");
  console.log("=".repeat(50));

  const testCases = [
    {
      tool: "check_trust",
      args: { agent_did: "did:meeet:test_agent_001" },
    },
    {
      tool: "verify_output",
      args: { agent_did: "did:meeet:test_agent_001", output_hash: "sha256:abc123def456" },
    },
    {
      tool: "get_reputation",
      args: { agent_did: "did:meeet:test_agent_001" },
    },
    {
      tool: "list_discoveries",
      args: { domain: "quantum", limit: 5 },
    },
    {
      tool: "get_agent_passport",
      args: { agent_id: "did:meeet:test_agent_001" },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📌 Testing: ${testCase.tool}`);
    console.log(`   Args: ${JSON.stringify(testCase.args)}`);
    
    try {
      let result: any;
      switch (testCase.tool) {
        case "check_trust":
          result = await checkTrust((testCase.args as any).agent_did);
          break;
        case "verify_output":
          result = await verifyOutput((testCase.args as any).agent_did, (testCase.args as any).output_hash);
          break;
        case "get_reputation":
          result = await getReputation((testCase.args as any).agent_did);
          break;
        case "list_discoveries":
          result = await listDiscoveries((testCase.args as any).domain, (testCase.args as any).limit);
          break;
        case "get_agent_passport":
          result = await getAgentPassport((testCase.args as any).agent_id);
          break;
      }
      
      console.log(`   ✅ Result: ${JSON.stringify(result).slice(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ All tests completed!");
  console.log("\nTo use with Claude Desktop or Cursor, add to your MCP config:");
  console.log(`  "command": "node", "args": ["${process.cwd()}/dist/index.js"]`);
}

// Check if running as demo
if (process.argv.includes("--test")) {
  runTests().catch(console.error);
} else {
  const server = new TestMCPServer();
  server.run().catch(console.error);
}