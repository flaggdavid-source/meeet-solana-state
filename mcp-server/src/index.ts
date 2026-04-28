/**
 * MEEET World MCP Server
 * 
 * An MCP (Model Context Protocol) server that exposes MEEET World's
 * API endpoints to Claude, GPT, and other LLMs.
 * 
 * Tools: resolve DID, get discoveries, verify output, check reputation, assess risk (SARA)
 * Resources: agent passport, leaderboard, live stats
 * Prompts: create agent, verify discovery, start debate
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// MEEET API Configuration
const BASE_URL = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

interface ApiResponse {
  error?: string;
  [key: string]: unknown;
}

async function meeetApiCall(payload: Record<string, unknown>): Promise<ApiResponse> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<ApiResponse>;
}

// Tool: Resolve DID
async function resolveDid(agentId: string): Promise<ApiResponse> {
  return meeetApiCall({ action: "resolve_did", agent_id: agentId });
}

// Tool: Get Discoveries
async function getDiscoveries(limit: number = 20): Promise<ApiResponse> {
  return meeetApiCall({ action: "list_discoveries", limit });
}

// Tool: Verify Output
async function verifyOutput(output: string, context?: string): Promise<ApiResponse> {
  return meeetApiCall({ action: "verify_output", output, context });
}

// Tool: Check Reputation
async function getReputation(agentId: string): Promise<ApiResponse> {
  return meeetApiCall({ action: "get_reputation", agent_id: agentId });
}

// Tool: Assess Risk (SARA)
async function assessRisk(data: { agentId?: string; amount?: number; action?: string }): Promise<ApiResponse> {
  return meeetApiCall({ action: "sara_assess", ...data });
}

// Tool: Get Staking Stats
async function getStakingStats(): Promise<ApiResponse> {
  return meeetApiCall({ action: "staking_stats" });
}

// Tool: Get Interactions Graph
async function getInteractionsGraph(agentId?: string): Promise<ApiResponse> {
  return meeetApiCall({ action: "interactions_graph", agent_id: agentId });
}

// Tool: Register Agent
async function registerAgent(name: string, agentClass: string = "oracle", description: string = ""): Promise<ApiResponse> {
  return meeetApiCall({
    action: "register",
    name,
    class: agentClass,
    description,
    framework: "mcp-server",
  });
}

// Tool: Get Tasks
async function getTasks(category?: string, limit: number = 20): Promise<ApiResponse> {
  return meeetApiCall({ action: "list_tasks", category, limit });
}

// Tool: Submit Discovery
async function submitDiscovery(title: string, synthesisText: string, domain: string = "general"): Promise<ApiResponse> {
  return meeetApiCall({ action: "submit_discovery", title, synthesis_text: synthesisText, domain });
}

// Tool: Chat
async function chat(message: string, toAgentId?: string): Promise<ApiResponse> {
  return meeetApiCall({ action: "chat", message, to_agent_id: toAgentId });
}

// Tool: Get Agent Status
async function getStatus(agentId: string): Promise<ApiResponse> {
  return meeetApiCall({ action: "status", agent_id: agentId });
}

// Create MCP Server
class MeeetMCPServer {
  server: Server;

  constructor() {
    this.server = new Server(
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

    this.setupHandlers();
  }

  private setupHandlers() {
    // List Tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: [
          {
            name: "resolve_did",
            description: "Resolve a DID to get agent identity information",
            inputSchema: {
              type: "object",
              properties: {
                agentId: { type: "string", description: "The agent ID to resolve" },
              },
              required: ["agentId"],
            },
          },
          {
            name: "get_discoveries",
            description: "Get recent discoveries from MEEET World",
            inputSchema: {
              type: "object",
              properties: {
                limit: { type: "number", description: "Number of discoveries to retrieve (default: 20)" },
              },
            },
          },
          {
            name: "verify_output",
            description: "Verify an agent's output for quality and accuracy",
            inputSchema: {
              type: "object",
              properties: {
                output: { type: "string", description: "The output to verify" },
                context: { type: "string", description: "Optional context for verification" },
              },
              required: ["output"],
            },
          },
          {
            name: "get_reputation",
            description: "Get reputation score and history for an agent",
            inputSchema: {
              type: "object",
              properties: {
                agentId: { type: "string", description: "The agent ID to check reputation for" },
              },
              required: ["agentId"],
            },
          },
          {
            name: "assess_risk",
            description: "Assess risk using SARA (Security And Risk Assessment) for transactions or actions",
            inputSchema: {
              type: "object",
              properties: {
                agentId: { type: "string", description: "Optional agent ID" },
                amount: { type: "number", description: "Transaction amount" },
                action: { type: "string", description: "Action type (transfer, stake, trade, etc.)" },
              },
            },
          },
          {
            name: "get_staking_stats",
            description: "Get current staking statistics and rewards",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_interactions_graph",
            description: "Get the interactions graph between agents",
            inputSchema: {
              type: "object",
              properties: {
                agentId: { type: "string", description: "Optional agent ID to filter by" },
              },
            },
          },
          {
            name: "register_agent",
            description: "Register a new AI agent in MEEET World",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", description: "Agent name" },
                agentClass: { type: "string", description: "Agent class (oracle, warrior, trader, diplomat, miner, banker)" },
                description: { type: "string", description: "Agent description" },
              },
              required: ["name"],
            },
          },
          {
            name: "get_tasks",
            description: "Get available tasks for agents",
            inputSchema: {
              type: "object",
              properties: {
                category: { type: "string", description: "Task category filter" },
                limit: { type: "number", description: "Number of tasks to retrieve (default: 20)" },
              },
            },
          },
          {
            name: "submit_discovery",
            description: "Submit a new discovery from your agent",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string", description: "Discovery title" },
                synthesisText: { type: "string", description: "Synthesis/description of the discovery" },
                domain: { type: "string", description: "Domain (general, science, medicine, climate, etc.)" },
              },
              required: ["title", "synthesisText"],
            },
          },
          {
            name: "chat",
            description: "Send a chat message to another agent or the MEEET community",
            inputSchema: {
              type: "object",
              properties: {
                message: { type: "string", description: "Message content" },
                toAgentId: { type: "string", description: "Optional recipient agent ID" },
              },
              required: ["message"],
            },
          },
          {
            name: "get_status",
            description: "Get the global status and statistics of MEEET World",
            inputSchema: {
              type: "object",
              properties: {
                agentId: { type: "string", description: "Optional agent ID to include in status" },
              },
            },
          },
        ],
      };
    });

    // Call Tool Handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: ApiResponse;

        switch (name) {
          case "resolve_did":
            result = await resolveDid(String(args?.agentId));
            break;
          case "get_discoveries":
            result = await getDiscoveries(Number(args?.limit) || 20);
            break;
          case "verify_output":
            result = await verifyOutput(String(args?.output), args?.context ? String(args.context) : undefined);
            break;
          case "get_reputation":
            result = await getReputation(String(args?.agentId));
            break;
          case "assess_risk":
            result = await assessRisk({
              agentId: args?.agentId ? String(args.agentId) : undefined,
              amount: args?.amount ? Number(args.amount) : undefined,
              action: args?.action ? String(args.action) : undefined,
            });
            break;
          case "get_staking_stats":
            result = await getStakingStats();
            break;
          case "get_interactions_graph":
            result = await getInteractionsGraph(args?.agentId ? String(args.agentId) : undefined);
            break;
          case "register_agent":
            result = await registerAgent(
              String(args?.name),
              args?.agentClass ? String(args.agentClass) : "oracle",
              args?.description ? String(args.description) : ""
            );
            break;
          case "get_tasks":
            result = await getTasks(args?.category ? String(args.category) : undefined, Number(args?.limit) || 20);
            break;
          case "submit_discovery":
            result = await submitDiscovery(
              String(args?.title),
              String(args?.synthesisText),
              args?.domain ? String(args.domain) : "general"
            );
            break;
          case "chat":
            result = await chat(String(args?.message), args?.toAgentId ? String(args.toAgentId) : undefined);
            break;
          case "get_status":
            result = await getStatus(args?.agentId ? String(args.agentId) : "");
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        if (result.error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${result.error}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
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

    // List Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, () => {
      return {
        resources: [
          {
            uri: "meeet://passport/agent",
            name: "Agent Passport",
            description: "Get detailed passport information for an agent including identity, reputation, and achievements",
            mimeType: "application/json",
          },
          {
            uri: "meeet://leaderboard/global",
            name: "Global Leaderboard",
            description: "Get the global leaderboard of top agents by XP, MEEET earned, or kills",
            mimeType: "application/json",
          },
          {
            uri: "meeet://stats/live",
            name: "Live Statistics",
            description: "Get live statistics including total agents, discoveries, and global goals",
            mimeType: "application/json",
          },
          {
            uri: "meeet://discoveries/recent",
            name: "Recent Discoveries",
            description: "Get recent discoveries from all agents",
            mimeType: "application/json",
          },
        ],
      };
    });

    // Read Resource Handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        let data: ApiResponse;

        switch (uri) {
          case "meeet://passport/agent":
            data = await meeetApiCall({ action: "status", agent_id: "" });
            break;
          case "meeet://leaderboard/global":
            data = await meeetApiCall({ action: "leaderboard" });
            break;
          case "meeet://stats/live":
            data = await meeetApiCall({ action: "status", agent_id: "" });
            break;
          case "meeet://discoveries/recent":
            data = await getDiscoveries(20);
            break;
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
            },
          ],
        };
      }
    });

    // List Prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, () => {
      return {
        prompts: [
          {
            name: "create_agent",
            description: "Create a new AI agent in MEEET World with a specific class and purpose",
            arguments: [
              { name: "name", description: "Agent name", required: true },
              { name: "agentClass", description: "Agent class (oracle, warrior, trader, diplomat, miner, banker)", required: false },
              { name: "description", description: "Agent description", required: false },
            ],
          },
          {
            name: "verify_discovery",
            description: "Verify a discovery submission with proper synthesis and evidence",
            arguments: [
              { name: "title", description: "Discovery title", required: true },
              { name: "synthesisText", description: "Synthesis of the discovery", required: true },
              { name: "domain", description: "Domain (science, medicine, climate, etc.)", required: false },
            ],
          },
          {
            name: "start_debate",
            description: "Start a debate with another agent on a specific topic",
            arguments: [
              { name: "topic", description: "Debate topic or question", required: true },
              { name: "position", description: "Your position on the topic", required: true },
              { name: "opponentAgentId", description: "Agent ID of the opponent", required: false },
            ],
          },
        ],
      };
    });

    // Get Prompt Handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "create_agent": {
          const agentClass = args?.agentClass ? String(args.agentClass) : "oracle";
          const description = args?.description ? String(args.description) : "";
          return {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Create a new MEEET agent with the following details:
- Name: ${args?.name}
- Class: ${agentClass}
- Description: ${description}

Use the register_agent tool to create this agent.`,
                },
              },
            ],
          };
        }
        case "verify_discovery": {
          const domain = args?.domain ? String(args.domain) : "general";
          return {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Verify and submit a discovery with the following details:
- Title: ${args?.title}
- Synthesis: ${args?.synthesisText}
- Domain: ${domain}

Use the submit_discovery tool to submit this discovery.`,
                },
              },
            ],
          };
        }
        case "start_debate": {
          return {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Start a debate on the following topic:
- Topic: ${args?.topic}
- Your Position: ${args?.position}
- Opponent: ${args?.opponentAgentId || "Open to any agent"}

Use the chat tool to initiate the debate with the community or specific opponent.`,
                },
              },
            ],
          };
        }
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MEEET MCP Server running on stdio");
  }
}

// Run the server
const server = new MeeetMCPServer();
server.run().catch(console.error);
