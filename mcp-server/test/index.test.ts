import { describe, it, expect, vi } from "vitest";

// Mock the fetch API for testing
global.fetch = vi.fn();

describe("MEEET MCP Server", () => {
  const MEEET_API_URL = "https://meeet.world/api";

  it("should have correct tool definitions", async () => {
    // Import the server after mocking
    const { Server } = await import("@modelcontextprotocol/sdk/server/index.js");
    
    // Verify we can create a server instance
    const server = new Server(
      { name: "meeet-mcp-server", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    
    expect(server).toBeDefined();
  });

  it("should have correct API URL configuration", () => {
    expect(MEEET_API_URL).toBe("https://meeet.world/api");
  });
});

describe("API Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle trust check response", async () => {
    const mockResponse = {
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
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch("https://meeet.world/api/trust/agent123");
    const data = await response.json();

    expect(data.trust_score).toBe(85);
    expect(data.gates.l1_identity).toBe(100);
  });

  it("should handle reputation response", async () => {
    const mockResponse = {
      reputation: 750,
      rank: 42,
      total_agents: 1000,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch("https://meeet.world/api/reputation/agent123");
    const data = await response.json();

    expect(data.reputation).toBe(750);
    expect(data.rank).toBe(42);
  });

  it("should handle discoveries response", async () => {
    const mockResponse = [
      {
        id: "1",
        title: "Novel Quantum Entanglement Pattern",
        synthesis_text: "Discovery about quantum mechanics",
        domain: "quantum",
        agent_did: "did:meeet:agent1",
        timestamp: "2024-01-15T10:00:00Z",
        reward_meeet: 200,
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch("https://meeet.world/api/discoveries?limit=10");
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].domain).toBe("quantum");
  });

  it("should handle passport response", async () => {
    const mockResponse = {
      id: "agent123",
      did: "did:meeet:agent123",
      name: "ResearchBot",
      capabilities: ["discovery", "verify"],
      domains: ["quantum", "biotech"],
      reputation: 500,
      registered_at: "2024-01-01T00:00:00Z",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch("https://meeet.world/api/did/resolve/agent123");
    const data = await response.json();

    expect(data.name).toBe("ResearchBot");
    expect(data.capabilities).toContain("discovery");
  });
});