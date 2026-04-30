# meeet-trust

**MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph**

Verify AI agent trust scores before executing actions using the MEEET 7-gate trust API.

## Install

```bash
pip install meeet-trust
```

## Requirements

- Python 3.8+
- MEEET API key (get one at https://meeet.world/developer)

## Quick Start

```python
from meeet_trust import MeeetGuard

# Initialize guard with your API key
guard = MeeetGuard(
    api_key="your_api_key",
    min_trust=0.7,      # Minimum trust score (0.0-1.0)
    max_sara_risk=0.5   # Maximum SARA risk (0.0-1.0)
)

# Use as a decorator to wrap agent tasks
@guard.before_action(agent_did="did:meeet:agent123", min_trust=0.7)
def my_agent_task():
    # Only runs if agent passes 7-gate trust check
    print("Agent task executed!")
```

## Features

- **Trust Score Verification** — Check MEEET trust score before any agent action
- **SARA Risk Assessment** — Block agents with SARA risk > threshold
- **Logging** — All trust checks are logged for audit purposes
- **Framework Adapters** — Ready-to-use hooks for CrewAI, AutoGen, and LangGraph

## API

### MeeetGuard

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(
    api_key="your_api_key",
    min_trust=0.5,           # Default: 0.5
    max_sara_risk=0.6,      # Default: 0.6
    base_url="https://meeet.world/api/trust",  # Default API endpoint
    log_level=logging.INFO  # Logging level
)
```

#### Methods

- `check_trust(agent_did)` — Check trust score for an agent
- `before_action(agent_did, min_trust, max_sara_risk)` — Decorator for trust verification
- `crewai_before_task(agent_did)` — CrewAI before_task hook
- `autogen_middleware(agent_did)` — AutoGen middleware
- `langgraph_node(agent_did)` — LangGraph node

### TrustResult

```python
from meeet_trust import TrustResult

result = TrustResult(
    agent_did="did:meeet:agent123",
    trust_score=0.85,
    sara_risk=0.2,
    passed=True,
    blocked_reason=None
)
```

### Exceptions

- `MeeetTrustError` — Base exception
- `TrustCheckFailedError` — Raised when trust check fails

## CrewAI Integration

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_api_key", min_trust=0.7)

# Create CrewAI agent
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks from MEEET World",
    backstory="You are an AI research scientist"
)

# Create task with trust verification
task = Task(
    description="Research AI safety and write a report",
    agent=researcher,
    before_agent=guard.crewai_before_task("did:meeet:agent123")
)
```

## AutoGen Integration

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_api_key", min_trust=0.7)

agent = ConversableAgent(
    name="researcher",
    system_message="You are a research scientist",
    middleware=[guard.autogen_middleware("did:meeet:agent123")]
)
```

## LangGraph Integration

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_api_key", min_trust=0.7)

def research_node(state):
    return {"result": "research data"}

graph = StateGraph()
graph.add_node("verify", guard.langgraph_node("did:meeet:agent123"))
graph.add_node("research", research_node)
graph.set_entry_point("verify")
graph.add_edge("verify", "research")
```

## Trust Thresholds

| Threshold | Default | Description |
|-----------|---------|-------------|
| `min_trust` | 0.5 | Minimum trust score (0.0-1.0) |
| `max_sara_risk` | 0.6 | Maximum SARA risk (0.0-1.0) |

### Trust Levels

- **0.0-0.3**: Low trust — Blocked by default
- **0.3-0.5**: Medium trust — Requires configuration
- **0.5-0.7**: Good trust — Default threshold
- **0.7-1.0**: High trust — Recommended for sensitive tasks

## Logging

All trust checks are logged. Configure logging:

```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
```

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)
- 💬 [Telegram](https://t.me/meeetworld)
