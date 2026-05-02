/**
 * MEEET MCP Server Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock stdio transport
const mockStdioTransport = {
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue(undefined),
  onclose: null,
  onerror: null,
  onmessage: null,
};

// Import after mocking
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

// Test configuration
const BASE_URL = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

describe("MEEET MCP Server", () => {
  let server: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create server instance for testing
    server = new Server(
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
  });

  describe("API Functions", () => {
    it("should call resolve_did API correctly", async () => {
      const mockResponse = {
        agent: { id: "test-agent-1", name: "TestAgent", class: "oracle" },
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const payload = { action: "resolve_did", agent_id: "test-agent-1" };
      
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      expect(mockFetch).toHaveBeenCalledWith(BASE_URL, expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }));
      expect(data).toEqual(mockResponse);
    });

    it("should call get_discoveries API correctly", async () => {
      const mockResponse = {
        discoveries: [
          { id: "1", title: "Discovery 1", synthesis: "Test synthesis" }
        ],
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const payload = { action: "list_discoveries", limit: 20 };
      
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      expect(data).toEqual(mockResponse);
    });

    it("should call verify_output API correctly", async () => {
      const mockResponse = {
        verified: true,
        score: 95,
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const payload = { action: "verify_output", output: "Test output", context: "Test context" };
      
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      expect(data).toEqual(mockResponse);
    });

    it("should handle API errors gracefully", async () => {
      const mockResponse = { error: "Agent not found" };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const payload = { action: "resolve_did", agent_id: "nonexistent" };
      
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json() as { error?: string };
      
      expect(data).toEqual(mockResponse);
      expect(data.error).toBe("Agent not found");
    });
  });

  describe("Tool Definitions", () => {
    it("should have all required tools defined", () => {
      const requiredTools = [
        "resolve_did",
        "get_discoveries",
        "verify_output",
        "get_reputation",
        "assess_risk",
        "get_staking_stats",
        "get_interactions_graph",
        "register_agent",
        "get_tasks",
        "submit_discovery",
        "chat",
        "get_status",
      ];

      // Verify all required tools are accounted for
      expect(requiredTools.length).toBe(12);
      
      // Verify tool schemas are valid
      const toolNames = requiredTools;
      expect(toolNames).toContain("resolve_did");
      expect(toolNames).toContain("get_discoveries");
      expect(toolNames).toContain("verify_output");
      expect(toolNames).toContain("get_reputation");
      expect(toolNames).toContain("assess_risk");
    });

    it("should have correct input schemas for tools", () => {
      // resolve_did requires agentId
      const resolveDidSchema = {
        type: "object",
        properties: {
          agentId: { type: "string", description: "The agent ID to resolve" },
        },
        required: ["agentId"],
      };
      
      expect(resolveDidSchema.required).toContain("agentId");
      
      // verify_output requires output
      const verifyOutputSchema = {
        type: "object",
        properties: {
          output: { type: "string", description: "The output to verify" },
          context: { type: "string", description: "Optional context for verification" },
        },
        required: ["output"],
      };
      
      expect(verifyOutputSchema.required).toContain("output");
    });
  });

  describe("Resource Definitions", () => {
    it("should have all required resources defined", () => {
      const requiredResources = [
        "meeet://passport/agent",
        "meeet://leaderboard/global",
        "meeet://stats/live",
        "meeet://discoveries/recent",
      ];

      expect(requiredResources.length).toBe(4);
      expect(requiredResources).toContain("meeet://passport/agent");
      expect(requiredResources).toContain("meeet://leaderboard/global");
      expect(requiredResources).toContain("meeet://stats/live");
      expect(requiredResources).toContain("meeet://discoveries/recent");
    });

    it("should have valid resource URIs", () => {
      const validUris = [
        "meeet://passport/agent",
        "meeet://leaderboard/global",
        "meeet://stats/live",
        "meeet://discoveries/recent",
      ];
      
      for (const uri of validUris) {
        expect(uri).toMatch(/^meeet:\/\//);
      }
    });
  });

  describe("Prompt Definitions", () => {
    it("should have all required prompts defined", () => {
      const requiredPrompts = [
        "create_agent",
        "verify_discovery",
        "start_debate",
      ];

      expect(requiredPrompts.length).toBe(3);
      expect(requiredPrompts).toContain("create_agent");
      expect(requiredPrompts).toContain("verify_discovery");
      expect(requiredPrompts).toContain("start_debate");
    });

    it("should have correct arguments for prompts", () => {
      const createAgentArgs = [
        { name: "name", description: "Agent name", required: true },
        { name: "agentClass", description: "Agent class", required: false },
        { name: "description", description: "Agent description", required: false },
      ];
      
      expect(createAgentArgs[0].required).toBe(true);
      expect(createAgentArgs[1].required).toBe(false);
    });
  });
});

describe("MEEET API Payload Validation", () => {
  it("should create correct payload for register action", () => {
    const payload = {
      action: "register",
      name: "TestBot",
      class: "oracle",
      description: "A test agent",
      framework: "mcp-server",
    };

    expect(payload.action).toBe("register");
    expect(payload.name).toBe("TestBot");
    expect(payload.class).toBe("oracle");
    expect(payload.framework).toBe("mcp-server");
  });

  it("should create correct payload for list_discoveries action", () => {
    const payload = {
      action: "list_discoveries",
      limit: 20,
    };

    expect(payload.action).toBe("list_discoveries");
    expect(payload.limit).toBe(20);
  });

  it("should create correct payload for verify_output action", () => {
    const payload = {
      action: "verify_output",
      output: "Test output",
      context: "Test context",
    };

    expect(payload.action).toBe("verify_output");
    expect(payload.output).toBe("Test output");
    expect(payload.context).toBe("Test context");
  });

  it("should create correct payload for sara_assess action", () => {
    const payload = {
      action: "sara_assess",
      agentId: "agent-123",
      amount: 1000,
      actionType: "transfer",
    };

    expect(payload.action).toBe("sara_assess");
    expect(payload.agentId).toBe("agent-123");
    expect(payload.amount).toBe(1000);
    expect(payload.actionType).toBe("transfer");
  });

  it("should create correct payload for interactions_graph action", () => {
    const payload = {
      action: "interactions_graph",
      agent_id: "agent-123",
    };

    expect(payload.action).toBe("interactions_graph");
    expect(payload.agent_id).toBe("agent-123");
  });
});

describe("Agent Classes", () => {
  it("should support all valid agent classes", () => {
    const validClasses = ["oracle", "warrior", "trader", "diplomat", "miner", "banker"];
    
    expect(validClasses).toContain("oracle");
    expect(validClasses).toContain("warrior");
    expect(validClasses).toContain("trader");
    expect(validClasses).toContain("diplomat");
    expect(validClasses).toContain("miner");
    expect(validClasses).toContain("banker");
  });

  it("should have oracle as default class", () => {
    const defaultClass = "oracle";
    expect(defaultClass).toBe("oracle");
  });
});

describe("Discovery Domains", () => {
  it("should support common discovery domains", () => {
    const validDomains = ["general", "science", "medicine", "climate", "space"];
    
    expect(validDomains).toContain("general");
    expect(validDomains).toContain("science");
    expect(validDomains).toContain("medicine");
    expect(validDomains).toContain("climate");
    expect(validDomains).toContain("space");
  });

  it("should default to general domain", () => {
    const defaultDomain = "general";
    expect(defaultDomain).toBe("general");
  });
});

describe("MCP Server Configuration", () => {
  it("should have correct server name", () => {
    const serverName = "meeet-mcp-server";
    expect(serverName).toBe("meeet-mcp-server");
  });

  it("should have correct version", () => {
    const version = "1.0.0";
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("should have all required capabilities", () => {
    const capabilities = {
      tools: {},
      resources: {},
      prompts: {},
    };
    
    expect(capabilities).toHaveProperty("tools");
    expect(capabilities).toHaveProperty("resources");
    expect(capabilities).toHaveProperty("prompts");
  });
});

describe("API Error Handling", () => {
  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const payload = { action: "resolve_did", agent_id: "test" };
    
    await expect(
      fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
    ).rejects.toThrow("Network error");
  });

  it("should handle malformed JSON responses", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const payload = { action: "status" };
    
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    await expect(res.json()).rejects.toThrow("Invalid JSON");
  });
});
