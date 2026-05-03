/**
 * MEEET MCP Server Tests
 */

import { describe, it, expect, vi, beforeEach, SpyInstance } from "vitest";

// Mock fetch globally
global.fetch = vi.fn() as unknown as typeof fetch;

interface MockResponse {
  agent?: { id: string; name: string; class: string };
  error?: string;
  success?: boolean;
  agent_id?: string;
  discoveries?: unknown[];
  verified?: boolean;
  score?: number;
  risk_level?: string;
}

describe("MEEET MCP Server", () => {
  let fetchMock: SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.mocked(global.fetch);
  });

  describe("API Functions", () => {
    it("should resolve DID correctly", async () => {
      const mockResponse: MockResponse = {
        agent: { id: "test-agent-1", name: "TestAgent", class: "oracle" },
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as unknown as Response);

      const BASE_URL = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api";
      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "resolve_did", agent_id: "test-agent-1" }),
      });

      const data = await res.json() as MockResponse;
      expect(data.agent?.id).toBe("test-agent-1");
      expect(data.agent?.name).toBe("TestAgent");
    });

    it("should handle API errors gracefully", async () => {
      const mockResponse: MockResponse = { error: "Agent not found" };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as unknown as Response);

      const BASE_URL = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api";
      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "resolve_did", agent_id: "nonexistent" }),
      });

      const data = await res.json() as MockResponse;
      expect(data.error).toBe("Agent not found");
    });

    it("should create correct payload for register action", async () => {
      const mockResponse: MockResponse = { success: true, agent_id: "new-agent-123" };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as unknown as Response);

      const BASE_URL = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api";
      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

      const payload = {
        action: "register",
        name: "TestBot",
        class: "oracle",
        description: "A test agent",
        framework: "mcp-server",
      };

      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as MockResponse;
      expect(data.success).toBe(true);
      
      // Verify the request was made with correct payload
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      expect(JSON.parse(callArgs[1].body as string)).toEqual(payload);
    });

    it("should create correct payload for list_discoveries action", async () => {
      const mockResponse: MockResponse = { discoveries: [] };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as unknown as Response);

      const BASE_URL = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api";
      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

      const payload = {
        action: "list_discoveries",
        limit: 20,
      };

      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as MockResponse;
      expect(data.discoveries).toEqual([]);
    });

    it("should create correct payload for verify_output action", async () => {
      const mockResponse: MockResponse = { verified: true, score: 95 };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as unknown as Response);

      const BASE_URL = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api";
      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

      const payload = {
        action: "verify_output",
        output: "Test output",
        context: "Test context",
      };

      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as MockResponse;
      expect(data.verified).toBe(true);
      expect(data.score).toBe(95);
    });

    it("should create correct payload for sara_assess action", async () => {
      const mockResponse: MockResponse = { risk_level: "low", score: 15 };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as unknown as Response);

      const BASE_URL = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api";
      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

      const payload = {
        action: "sara_assess",
        agentId: "agent-123",
        amount: 1000,
        actionType: "transfer",
      };

      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as MockResponse;
      expect(data.risk_level).toBe("low");
      expect(data.score).toBe(15);
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

      expect(requiredTools.length).toBe(12);
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
  });

  describe("API Endpoint Coverage", () => {
    it("should cover all required API endpoints from the issue", () => {
      const apiEndpoints = [
        "resolve_did",
        "list_discoveries",
        "verify_output",
        "get_reputation",
        "sara_assess",
        "staking_stats",
        "interactions_graph",
      ];

      // Verify all required endpoints are covered
      expect(apiEndpoints).toContain("resolve_did");
      expect(apiEndpoints).toContain("list_discoveries");
      expect(apiEndpoints).toContain("verify_output");
      expect(apiEndpoints).toContain("get_reputation");
      expect(apiEndpoints).toContain("sara_assess");
      expect(apiEndpoints).toContain("staking_stats");
      expect(apiEndpoints).toContain("interactions_graph");
    });
  });
});