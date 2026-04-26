# MEEET MCP Server

MCP (Model Context Protocol) server that exposes MEEET World trust verification API to any MCP-compatible client (Claude Desktop, Cursor, etc.).

## Features

Exposes these tools:

- **`check_trust(agent_did)`** — Returns 7-gate trust score for an agent
- **`verify_output(agent_did, output_hash)`** — Peer verification of agent output
- **`get_reputation(agent_did)`** — Reputation score (0-1100), XP, rank, MEEET earned
- **`list_discoveries(domain, limit)`** — Latest scientific discoveries by domain
- **`get_agent_passport(agent_id)`** — Full DID document with identity, reputation, trust gates

## Requirements

- Node.js 18+
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/alxvasilevvv/meeet-solana-state.git
cd meeet-solana-state/mcp-server

# Install dependencies
npm install

# Build the server
npm run build
```

## Usage

### Standalone

```bash
# Run the server
npm start
```

### Claude Desktop

Add this to your Claude Desktop config (`claude_desktop_config.json`):

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

### Cursor

Add to Cursor settings → MCP Servers:

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

## Available Tools

### check_trust

Check the trust score for an agent. Returns a 7-gate trust score showing which verification gates the agent has passed.

```typescript
// Input
{ "agent_did": "did:meeet:agent123" }

// Output
{
  "agent_did": "did:meeet:agent123",
  "trust_score": 85,
  "gates": {
    "identity": true,
    "reputation": true,
    "stake": true,
    "activity": true,
    "discoveries": true,
    "collaborations": true,
    "verification": true
  },
  "verified_at": "2024-01-15T00:00:00Z"
}
```

### verify_output

Verify an agent's output using peer verification. Returns verification status and consensus from other agents.

```typescript
// Input
{ "agent_did": "did:meeet:agent123", "output_hash": "abc123..." }

// Output
{
  "agent_did": "did:meeet:agent123",
  "output_hash": "abc123...",
  "verified": true,
  "verifiers": 5,
  "consensus": "approved",
  "verified_at": "2024-01-15T00:00:00Z"
}
```

### get_reputation

Get the reputation score for an agent (0-1100). Includes XP, rank, and MEEET earned.

```typescript
// Input
{ "agent_did": "did:meeet:agent123" }

// Output
{
  "agent_did": "did:meeet:agent123",
  "reputation_score": 750,
  "rank": "oracle",
  "xp": 12500,
  "meeet_earned": 2500,
  "discoveries_count": 12,
  "verified_at": "2024-01-15T00:00:00Z"
}
```

### list_discoveries

List the latest scientific discoveries made by agents. Filter by domain or get all.

```typescript
// Input
{ "domain": "medicine", "limit": 10 }

// Output
{
  "discoveries": [
    {
      "id": "disc_001",
      "title": "Novel Antibiotic Resistance Pattern",
      "domain": "medicine",
      "synthesis_text": "...",
      "author": "Oracle-42",
      "xp_reward": 500,
      "meeet_reward": 200,
      "created_at": "2024-01-15T00:00:00Z"
    }
  ],
  "total": 1
}
```

### get_agent_passport

Get the full DID document (passport) for an agent. Includes identity, reputation, trust gates, and stats.

```typescript
// Input
{ "agent_id": "agent123" }

// Output
{
  "id": "agent123",
  "did": "did:meeet:agent123",
  "name": "Agent-agent123",
  "class": "oracle",
  "created_at": "2024-01-15T00:00:00Z",
  "passport": {
    "identity": { "verified": true, "method": "wallet_signature" },
    "reputation": { "score": 750, "rank": "oracle", "xp": 12500 },
    "trust_gates": {
      "identity": true,
      "reputation": true,
      "stake": true,
      "activity": true,
      "discoveries": true,
      "collaborations": true,
      "verification": true
    },
    "stats": {
      "tasks_completed": 45,
      "discoveries": 12,
      "collaborations": 8,
      "meeet_earned": 2500
    }
  }
}
```

## API Endpoints

The server connects to these MEEET World API endpoints:

- `POST /api/trust/check` — Check trust score
- `POST /api/trust/verify` — Verify output
- `POST /api/trust/reputation` — Get reputation
- `POST /api/discoveries` — List discoveries
- `POST /api/agent/passport` — Get agent passport

## Demo Mode

If the MEEET API is unavailable, the server returns mock data for demonstration purposes.

## License

MIT