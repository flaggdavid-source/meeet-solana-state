#!/usr/bin/env npx tsx
/**
 * Demo script to test the MEEET MCP Server locally
 * This simulates MCP client requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Mock API responses for demo
const mockApiResponses = {
  trust: {
    trust_score: 85,
    gates: {
      l1_identity: 100,
      l2_authorization: 90,
      l2_sara: 85,
      l3_audit: 80,
      l4_verification: 75,
      l5_social: 70,
      l6_economic: 65,
    },
  },
  reputation: {
    reputation: 750,
    rank: 42,
    total_agents: 1000,
  },
  discoveries: [
    {
      id: "1",
      title: "Novel Quantum Entanglement Pattern",
      synthesis_text: "Discovery about quantum mechanics",
      domain: "quantum",
      agent_did: "did:meeet:agent1",
      timestamp: "2024-01-15T10:00:00Z",
      reward_meeet: 200,
    },
    {
      id: "2",
      title: "New Antibiotic Resistance Gene",
      synthesis_text: "Discovery about antibiotic resistance",
      domain: "biotech",
      agent_did: "did:meeet:agent2",
      timestamp: "2024-01-14T10:00:00Z",
      reward_meeet: 300,
    },
  ],
  passport: {
    id: "agent123",
    did: "did:meeet:agent123",
    name: "ResearchBot",
    capabilities: ["discovery", "verify"],
    domains: ["quantum", "biotech"],
    reputation: 500,
    registered_at: "2024-01-01T00:00:00Z",
  },
};

class DemoMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "meeet-mcp-server", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        {
          name: "check_trust",
          description: "Check the 7-gate trust score for an agent",
          inputSchema: {
            type: "object",
            properties: {
              agent_did: { type: "string", description: "Agent DID" },
            },
            required: ["agent_did"],
          },
        },
        {
          name: "verify_output",
          description: "Verify an agent's output using peer verification",
          inputSchema: {
            type: "object",
            properties: {
              agent_did: { type: "string", description: "Agent DID" },
              output_hash: { type: "string", description: "Output hash" },
            },
            required: ["agent_did", "output_hash"],
          },
        },
        {
          name: "get_reputation",
          description: "Get the reputation score (0-1100) for an agent",
          inputSchema: {
            type: "object",
            properties: {
              agent_did: { type: "string", description: "Agent DID" },
            },
            required: ["agent_did"],
          },
        },
        {
          name: "list_discoveries",
          description: "List the latest discoveries from MEEET World",
          inputSchema: {
            type: "object",
            properties: {
              domain: { type: "string", description: "Filter by domain" },
              limit: { type: "number", description: "Max results" },
            },
          },
        },
        {
          name: "get_agent_passport",
          description: "Get the full DID document for an agent",
          inputSchema: {
            type: "object",
            properties: {
              agent_id: { type: "string", description: "Agent ID" },
            },
            required: ["agent_id"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      let result: object;

      switch (name) {
        case "check_trust":
          result = { success: true, agent_did: args.agent_did, ...mockApiResponses.trust };
          break;
        case "verify_output":
          result = {
            success: true,
            agent_did: args.agent_did,
            output_hash: args.output_hash,
            verified: true,
            timestamp: new Date().toISOString(),
            verifier: "peer_agent_1",
          };
          break;
        case "get_reputation":
          result = { success: true, agent_did: args.agent_did, ...mockApiResponses.reputation };
          break;
        case "list_discoveries":
          result = {
            success: true,
            discoveries: mockApiResponses.discoveries,
            count: mockApiResponses.discoveries.length,
          };
          break;
        case "get_agent_passport":
          result = { success: true, passport: mockApiResponses.passport };
          break;
        default:
          result = { error: `Unknown tool: ${name}` };
      }

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MEEET MCP Demo Server running on stdio");
  }
}

// Run demo
const server = new DemoMCPServer();
server.run().catch(console.error);