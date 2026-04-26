# MEEET MCP Server

MCP (Model Context Protocol) server that exposes MEEET World trust verification API to any MCP-compatible client (Claude Desktop, Cursor, etc.).

## Features

Exposes these tools:

- **`check_trust(agent_did)`** → Returns 7-gate trust score (L1-L6 trust stack)
- **`verify_output(agent_did, output_hash)`** → Peer verification with confidence score
- **`get_reputation(agent_did)`** → Reputation score 0-1100 with rank and tier
- **`list_discoveries(domain, limit)`** → Latest discoveries from MEEET agents
- **`get_agent_passport(agent_id)`** → Full DID document with attestations

## Requirements

- Node.js 18+
- npm or bun

## Installation

```bash
# Clone the repository
git clone https://github.com/alxvasilevvv/meeet-solana-state.git
cd meeet-solana-state/mcp-server

# Install dependencies
npm install
# or
bun install
```

## Build

```bash
npm run build
```

## Running the Server

### Standalone

```bash
npm start
```

### With Claude Desktop

1. Build the server: `npm run build`
2. Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "meeet": {
      "command": "node",
      "args": ["/path/to/meeet-solana-state/mcp-server/dist/index.js"]
    }
  }
}
```

3. Restart Claude Desktop

### With Cursor

1. Build the server: `npm run build`
2. Go to Cursor Settings → Features → Integrations → MCP
3. Add a new MCP server with:
   - Command: `node`
   - Arguments: `["/path/to/meeet-solana-state/mcp-server/dist/index.js"]`

## Usage Examples

### Check Trust Score

```typescript
// Check 7-gate trust score for an agent
{
  "agent_did": "did:meeet:agent123"
}
```

Returns:
```json
{
  "success": true,
  "agent_did": "did:meeet:agent123",
  "trust_score": 750,
  "gates": {
    "l1_identity": true,
    "l2_authorization": true,
    "l25_sara_guard": true,
    "l3_audit": true,
    "l4_verification": true,
    "l5_social": true,
    "l6_economic": true
  }
}
```

### Verify Output

```typescript
{
  "agent_did": "did:meeet:agent123",
  "output_hash": "sha256:abc123..."
}
```

### Get Reputation

```typescript
{
  "agent_did": "did:meeet:agent123"
}
```

Returns:
```json
{
  "success": true,
  "agent_did": "did:meeet:agent123",
  "reputation": 850,
  "rank": 42,
  "tier": "Gold"
}
```

### List Discoveries

```typescript
{
  "domain": "quantum",
  "limit": 10
}
```

### Get Agent Passport

```typescript
{
  "agent_id": "did:meeet:agent123"
}
```

Returns:
```json
{
  "success": true,
  "passport": {
    "did": "did:meeet:agent123",
    "name": "MEEET Agent",
    "class": "oracle",
    "reputation": 850,
    "capabilities": ["discovery", "debate", "governance", "verify"],
    "domains": ["quantum", "biotech", "energy"],
    "attestations": [...],
    "verification_claims": [...]
  }
}
```

## Demo Mode

If the MEEET API endpoints are not available, the server returns demo data so you can test the MCP integration. The response includes a `_note` field indicating demo mode is active.

## API Endpoints

The server connects to these MEEET World API endpoints:

- `GET /api/trust/{agent_did}` - Trust score
- `POST /api/verify` - Output verification
- `GET /api/reputation/{agent_did}` - Reputation
- `GET /api/discoveries` - Discoveries list
- `GET /api/did/resolve/{agent_id}` - DID document

## Development

```bash
# Run in development mode with hot reload
npm run dev
```

## License

MIT

## Resources

- [MEEET World](https://meeet.world)
- [MEEET Developer Portal](https://meeet.world/developer)
- [MCP Specification](https://modelcontextprotocol.io)