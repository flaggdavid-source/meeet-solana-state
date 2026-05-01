# MEEET Trust Guard

AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph frameworks.

[![PyPI](https://img.shields.io/pypi/v/meeet-trust?style=for-the-badge)](https://pypi.org/project/meeet-trust/)
[![Python](https://img.shields.io/pypi/pyversions/meeet-trust?style=for-the-badge)](https://pypi.org/project/meeet-trust/)

> Trust verification for AI agents — before any action, verify trust via MEEET 7-gate API.

## Overview

MEEET Trust Guard provides trust verification for AI agent frameworks. Before any agent action executes:

1. Calls `meeet.world/api/trust/{agentDid}` to get trust score
2. Checks trust score against minimum threshold
3. Evaluates SARA risk assessment
4. Allows, warns, or blocks the action

## Installation

```bash
pip install meeet-trust
```

Or install from source:

```bash
git clone https://github.com/alxvasilevvv/meeet-solana-state.git
cd meeet-solana-state/meeet_trust
pip install -e .
```

## Quick Start

```python
from meeet_trust import MeeetGuard

# Initialize guard with your API key
guard = MeeetGuard(api_key="your_api_key")

# Use decorator to protect agent actions
@guard.before_action(min_trust=0.7, sara_threshold=0.6)
def my_agent_task(agent_did):
    # Only runs if agent passes trust verification
    print(f"Executing task for verified agent: {agent_did}")
```

## Features

- **Trust Score Verification** — Verify agent trust via MEEET 7-gate API
- **SARA Risk Assessment** — Block high-risk agents (SARA risk > 0.6)
- **Caching** — Cache trust scores for 5 minutes (configurable)
- **Multi-Framework Support** — CrewAI, AutoGen, LangGraph
- **Logging** — Full audit trail of all trust checks
- **Fail-Open Mode** — Optionally allow actions on API errors

## API

### MeeetGuard

```python
guard = MeeetGuard(
    api_key="your_api_key",
    base_url="https://meeet.world/api",  # Optional
    default_min_trust=0.5,               # Default: 0.5
    default_sara_threshold=0.6,          # Default: 0.6
    cache_ttl_seconds=300,               # Cache TTL: 5 min
    fail_open=False,                     # Block on API error
)
```

#### Methods

| Method | Description |
|--------|-------------|
| `get_trust_score(agent_did)` | Fetch trust score from API |
| `verify_trust(agent_did, ...)` | Verify trust for an agent |
| `before_action(...)` | Decorator to protect functions |
| `crewai_hook(agent, ...)` | CrewAI before_task integration |
| `autogen_middleware(agent, ...)` | AutoGen middleware |
| `langgraph_node(state, ...)` | LangGraph node |

### Before-Action Decorator

```python
@guard.before_action(min_trust=0.7, sara_threshold=0.6)
def my_task(agent_did):
    # Only executes if agent passes trust check
    pass
```

Returns:
- `TrustResult.ALLOWED` — Trust verified, action allowed
- `TrustResult.WARNED` — SARA risk in warning zone (0.6-0.8)
- `TrustResult.BLOCKED` — Trust score or SARA risk too high
- `TrustResult.ERROR` — API error

## CrewAI Integration

```python
from meeet_trust import MeeetGuard
from crewai import Agent, Task, Crew

guard = MeeetGuard(api_key="your_api_key")

# Create a protected agent
researcher = Agent(
    name="researcher",
    role="Research Scientist",
    goal="Find relevant scientific papers",
    backstory="Expert at scientific research",
    # Add before_task_hook
    before_task_hook=lambda ctx: guard.crewai_hook(
        ctx.get("agent"),
        min_trust=0.7,
    ),
)

# Tasks will only execute after trust verification
task = Task(
    description="Research AI safety",
    agent=researcher,
)

crew = Crew(agents=[researcher], tasks=[task])
crew.kickoff()
```

## AutoGen Integration

```python
from meeet_trust import MeeetGuard
from autogen import ConversableAgent

guard = MeeetGuard(api_key="your_api_key")

# Create agent
agent = ConversableAgent(
    name="assistant",
    llm_config={"model": "gpt-4"},
)

# Register trust middleware
@agent.register_for_execution()
@agent.register_for_chat()
def protected_function(agent_did: str, message: str):
    # This tool is protected by trust verification
    pass

# Add trust check as a hook
agent.register_hook(
    hook_type="after_tool_execution",
    hook=lambda name, req: guard.autogen_middleware(
        agent,
        tool_name=name,
        min_trust=0.7,
    ),
)
```

## LangGraph Integration

```python
from meeet_trust import MeeetGuard
from langgraph.graph import StateGraph

guard = MeeetGuard(api_key="your_api_key")

def trust_check_node(state: dict) -> dict:
    """LangGraph node that verifies trust before proceeding."""
    return guard.langgraph_node(
        state,
        min_trust=0.7,
        sara_threshold=0.6,
    )

# Build graph
graph = StateGraph()
graph.add_node("trust_check", trust_check_node)
graph.add_node("execute_task", execute_task_node)

# Trust check first
graph.add_edge("__start__", "trust_check")

# Conditional edge based on trust_verified
def should_continue(state):
    return state.get("trust_verified", False)

graph.add_conditional_edges(
    "trust_check",
    should_continue,
    {"true": "execute_task", "false": "__end__"}
)
```

## Trust Score Response

```python
{
    "agent_did": "did:meeet:agent123",
    "trust_score": 0.85,      # 0.0 - 1.0
    "sara_risk": 0.15,        # 0.0 - 1.0
    "layers": {
        "l1_identity": "verified",
        "l2_authorization": "passed", 
        "l2_5_sara": "passed",
        "l3_audit": "passed",
        "l4_verification": "passed",
        "l5_social": "passed",
        "l6_economic": "passed"
    },
    "timestamp": "2024-01-15T12:00:00Z"
}
```

## Trust Levels

| Level | Name | Description |
|-------|------|-------------|
| L1 | Identity | Cryptographic DID verification |
| L2 | Authorization | APS pre-execution check |
| L2.5 | SARA | Risk assessment scoring |
| L3 | Audit | Signet hash-chained receipts |
| L4 | Verification | Peer review + VeroQ |
| L5 | Social | ClawSocial behavioral scoring |
| L6 | Economic | MEEET staking requirement |

## Example: Full Integration

```python
from meeet_trust import (
    MeeetGuard, 
    TrustResult,
    MeeetTrustBlocked,
)
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

# Initialize guard
guard = MeeetGuard(
    api_key="your_api_key",
    default_min_trust=0.7,
    default_sara_threshold=0.6,
    fail_open=False,  # Block on API error
)

@guard.before_action(min_trust=0.7)
def execute_agent_task(agent_did: str, task_data: dict):
    """Protected agent task."""
    print(f"Executing task for {agent_did}")
    return {"status": "success"}

# Test with various agents
test_agents = [
    "did:meeet:verified_agent_001",
    "did:meeet:new_agent_002",
]

for agent in test_agents:
    try:
        result = execute_agent_task(agent, {"task": "research"})
        print(f"✅ Success: {result}")
    except MeeetTrustBlocked as e:
        print(f"🚫 Blocked: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
```

## Troubleshooting

### API Errors

If the MEEET API is unavailable, configure `fail_open=True`:

```python
guard = MeeetGuard(
    api_key="your_key",
    fail_open=True,  # Allow actions on API error
)
```

### Caching

Trust scores are cached for 5 minutes by default. Force refresh:

```python
trust_score = guard.get_trust_score(agent_did, force_refresh=True)
```

### Logging

Set log level for debugging:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
guard = MeeetGuard(api_key="your_key")
```

## License

MIT

## Links

- 🌐 **Website:** [meeet.world](https://meeet.world)
- 📖 **Docs:** [meeet.world/trust-api](https://meeet.world/trust-api)
- 💬 **Telegram:** [@meeetworld](https://t.me/meeetworld)
- 🐦 **Twitter:** [@Meeet_World](https://twitter.com/Meeet_World)