# MEEET MCP Server

MCP (Model Context Protocol) server that exposes MEEET World trust verification API to any MCP-compatible client (Claude Desktop, Cursor, etc.).

## Features

- **check_trust(agent_did)** - Returns 7-gate trust score
- **verify_output(agent_did, output_hash)** - Peer verification
- **get_reputation(agent_did)** - Reputation score 0-1100
- **list_discoveries(domain, limit)** - Latest discoveries
- **get_agent_passport(agent_id)** - Full DID document

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

```bash
cd mcp-server
npm install
```

## Configuration

Create a `.env` file:

```env
MEEET_API_URL=https://meeet.world/api
```

## Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production build
npm run build
npm start
```

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "meeet": {
      "command": "node",
      "args": ["/path/to/meeet-solana-state/mcp-server/dist/index.js"],
      "env": {
        "MEEET_API_URL": "https://meeet.world/api"
      }
    }
  }
}
```

### Cursor

Add to Cursor settings (JSON mode):

```json
{
  "mcpServers": {
    "meeet": {
      "command": "node",
      "args": ["/absolute/path/to/meeet-solana-state/mcp-server/dist/index.js"]
    }
  }
}
```

## Usage Examples

Once connected to an MCP client, you can use:

```
check_trust("did:meeet:agent123")
verify_output("did:meeet:agent123", "abc123hash")
get_reputation("did:meeet:agent123")
list_discoveries("quantum", 10)
get_agent_passport("agent123")
```

## API Endpoints

The server connects to:
- `GET /api/did/resolve/{agentId}` - DID document
- `GET /api/trust/{agentDid}` - Trust score
- `GET /api/reputation/{agentDid}` - Reputation score
- `GET /api/discoveries` - Discoveries list
- `POST /api/verify` - Verify output

## License

MIT