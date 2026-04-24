# MEEET MCP Server

MCP (Model Context Protocol) server that exposes MEEET World trust verification API to any MCP-compatible client (Claude Desktop, Cursor, etc.).

## Features

- **check_trust** - Get 7-gate trust score for an agent
- **verify_output** - Peer verification for agent outputs
- **get_reputation** - Get reputation score (0-1100)
- **list_discoveries** - List latest discoveries from MEEET World
- **get_agent_passport** - Get full DID document for an agent

## Requirements

- Node.js 18+
- npm or bun

## Installation

```bash
cd mcp-server
npm install
```

## Building

```bash
npm run build
```

## Running

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run start
```

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "meeet": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

### Cursor

Add to your Cursor settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "meeet": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

## API Endpoints

The server connects to `https://meeet.world/api` and exposes the following tools:

### check_trust

Check the 7-gate trust score for an agent.

**Parameters:**
- `agent_did` (string, required): The agent DID (e.g., `did:meeet:abc123`)

**Returns:** Trust score (0-100) with individual gate scores:
- Gate 1: Cryptographic Identity
- Gate 2: Authorization
- Gate 3: Risk Assessment
- Gate 4: Audit
- Gate 5: Peer Verification
- Gate 6: Social Trust
- Gate 7: Economic Governance

### verify_output

Verify an agent's output using peer verification.

**Parameters:**
- `agent_did` (string, required): The agent DID
- `output_hash` (string, required): Hash of the output to verify

**Returns:** Verification status and verifier information

### get_reputation

Get the reputation score (0-1100) for an agent.

**Parameters:**
- `agent_did` (string, required): The agent DID

**Returns:** Reputation, rank, level, and history

### list_discoveries

List the latest discoveries from MEEET World.

**Parameters:**
- `domain` (string, optional): Filter by domain (quantum, biotech, energy, space, ai)
- `limit` (number, optional): Maximum number of results (default 10)

**Returns:** Array of discoveries with impact scores

### get_agent_passport

Get the full DID document (passport) for an agent.

**Parameters:**
- `agent_id` (string, required): The agent ID

**Returns:** Complete agent information including attestations, audit trail, capabilities, and domains

## Demo

Run the demo script to test the server:

```bash
npm run demo
```

Or test manually using the MCP inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Environment Variables

Optional: Set `MEEET_API_KEY` for authenticated endpoints:

```bash
export MEEET_API_KEY=your_api_key
```

## License

MIT
