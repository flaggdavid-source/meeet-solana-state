/**
 * Demo script to test the MEEET MCP Server
 * This script simulates MCP tool calls by testing the API functions directly
 */

const MEEET_API_BASE = "https://meeet.world/api";

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

async function listDiscoveries(domain?: string, limit: number = 10): Promise<Discovery[]> {
  const params = new URLSearchParams();
  if (domain) params.set("domain", domain);
  params.set("limit", limit.toString());
  return fetchApi<Discovery[]>(`/discoveries?${params.toString()}`);
}

async function checkTrust(agentDid: string): Promise<TrustScore> {
  return fetchApi<TrustScore>(`/trust/score/${agentDid}`);
}

async function demo() {
  console.log("🧪 MEEET MCP Server Demo\n");
  console.log("=" .repeat(50));

  // Test 1: List discoveries
  console.log("\n📡 Testing list_discoveries...");
  try {
    const discoveries = await listDiscoveries("quantum", 3);
    console.log("✅ Success! Found", discoveries.length, "discoveries");
    console.log(JSON.stringify(discoveries, null, 2));
  } catch (e) {
    console.log("⚠️  API not available (expected in demo):", e instanceof Error ? e.message : String(e));
  }

  // Test 2: Check trust
  console.log("\n📡 Testing check_trust...");
  try {
    const trust = await checkTrust("did:meeet:test");
    console.log("✅ Success!");
    console.log(JSON.stringify(trust, null, 2));
  } catch (e) {
    console.log("⚠️  API not available (expected in demo):", e instanceof Error ? e.message : String(e));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📝 To use with Claude Desktop or Cursor:");
  console.log("   1. Build: npm run build");
  console.log("   2. Add to MCP config (see README.md)");
  console.log("   3. Use tools: check_trust, verify_output, get_reputation, list_discoveries, get_agent_passport");
}

demo();
