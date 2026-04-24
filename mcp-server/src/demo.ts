/**
 * MEEET MCP Server Demo Script
 * 
 * Tests the MCP server by spawning it and sending JSON-RPC requests via stdin/stdout.
 * Usage: npx tsx src/demo.ts
 */

import { spawn } from "child_process";

async function sendRequest(process: ReturnType<typeof spawn>, request: object): Promise<any> {
  return new Promise((resolve) => {
    let data = "";
    process.stdout.on("data", (chunk) => {
      data += chunk.toString();
      try {
        const lines = data.split("\n").filter(l => l.trim());
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.id === (request as any).id) {
              resolve(parsed);
            }
          } catch {}
        }
      } catch {}
    });
    
    process.stdin.write(JSON.stringify(request) + "\n");
  });
}

async function demo() {
  console.log("🤖 MEEET World MCP Server Demo\n");
  console.log("=".repeat(50));

  const server = spawn("node", ["dist/index.js"], {
    stdio: ["pipe", "pipe", "pipe"]
  });

  // Capture stderr (console.error output)
  server.stderr.on("data", (chunk) => {
    console.log("[Server]:", chunk.toString().trim());
  });

  let id = 1;

  try {
    // Initialize
    console.log("🔄 Initializing MCP connection...");
    const init = await sendRequest(server, {
      jsonrpc: "2.0",
      id: id++,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "meeet-demo", version: "1.0.0" }
      }
    });
    console.log("✅ Server initialized\n");

    // Send initialized notification
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

    // List tools
    console.log("📋 Available Tools:");
    const toolsResp: any = await sendRequest(server, {
      jsonrpc: "2.0",
      id: id++,
      method: "tools/list"
    });
    
    for (const tool of toolsResp.result?.tools || []) {
      console.log(`   • ${tool.name}`);
    }
    console.log();

    // Demo 1: Check Trust
    console.log("🔍 Demo 1: Check Trust Score");
    const trustResp: any = await sendRequest(server, {
      jsonrpc: "2.0",
      id: id++,
      method: "tools/call",
      params: {
        name: "check_trust",
        arguments: { agent_did: "did:meeet:agent-123" }
      }
    });
    const trustData = JSON.parse(trustResp.result?.content?.[0]?.text || "{}");
    console.log(`   Score: ${trustData.score}`);
    console.log(`   Gates:`, trustData.gates);
    console.log();

    // Demo 2: Verify Output
    console.log("🔐 Demo 2: Verify Output");
    const verifyResp: any = await sendRequest(server, {
      jsonrpc: "2.0",
      id: id++,
      method: "tools/call",
      params: {
        name: "verify_output",
        arguments: { agent_did: "did:meeet:agent-123", output_hash: "abc123" }
      }
    });
    const verifyData = JSON.parse(verifyResp.result?.content?.[0]?.text || "{}");
    console.log(`   Verified: ${verifyData.verified}`);
    console.log();

    // Demo 3: Get Reputation
    console.log("⭐ Demo 3: Get Reputation");
    const repResp: any = await sendRequest(server, {
      jsonrpc: "2.0",
      id: id++,
      method: "tools/call",
      params: {
        name: "get_reputation",
        arguments: { agent_did: "did:meeet:agent-456" }
      }
    });
    const repData = JSON.parse(repResp.result?.content?.[0]?.text || "{}");
    console.log(`   Score: ${repData.score}`);
    console.log(`   Rank: ${repData.rank}/${repData.total_agents}`);
    console.log();

    // Demo 4: List Discoveries
    console.log("🔬 Demo 4: List Discoveries (medicine)");
    const discResp: any = await sendRequest(server, {
      jsonrpc: "2.0",
      id: id++,
      method: "tools/call",
      params: {
        name: "list_discoveries",
        arguments: { domain: "medicine", limit: 5 }
      }
    });
    const discData = JSON.parse(discResp.result?.content?.[0]?.text || "{}");
    console.log(`   Found: ${discData.discoveries?.length} discoveries`);
    discData.discoveries?.slice(0, 2).forEach((d: any) => {
      console.log(`   - ${d.title.slice(0, 50)}...`);
    });
    console.log();

    // Demo 5: Get Agent Passport
    console.log("🛂 Demo 5: Get Agent Passport");
    const passportResp: any = await sendRequest(server, {
      jsonrpc: "2.0",
      id: id++,
      method: "tools/call",
      params: {
        name: "get_agent_passport",
        arguments: { agent_id: "agent-789" }
      }
    });
    const passportData = JSON.parse(passportResp.result?.content?.[0]?.text || "{}");
    console.log(`   Name: ${passportData.name}`);
    console.log(`   Class: ${passportData.agent_class}`);
    console.log(`   Achievements: ${passportData.achievements?.length}`);
    console.log();

    console.log("=".repeat(50));
    console.log("✅ All demos completed successfully!");
    console.log("\n💡 To use with Claude Desktop or Cursor,");
    console.log("   add this to your MCP config:");
    console.log(`   { "command": "node", "args": ["${process.cwd()}/dist/index.js"] }`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    server.kill();
    process.exit(0);
  }
}

demo();
