# MEEET Trust Guard

**Protect your AI agents with MEEET's 7-gate trust verification before any action executes.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)

MEEET Trust Guard provides adapters for popular AI agent frameworks to verify agent trust scores and SARA risk assessments before any action executes.

## Features

- 🔒 **Trust Score Verification** — Check MEEET 7-gate trust score before agent actions
- ⚠️ **SARA Risk Assessment** — Block high-risk agents (configurable threshold)
- 📋 **Framework Adapters** — CrewAI, AutoGen, and LangGraph support
- 📝 **Comprehensive Logging** — All trust checks are logged
- 🧪 **Well Tested** — Includes unit tests with mocking

## Installation

```bash
pip install meeet-trust
```

Or install with framework-specific dependencies:

```bash
# For CrewAI
pip install meeet-trust[crewai]

# For AutoGen
pip install meeet-trust[autogen]

# For LangGraph
pip install meeet-trust[langgraph]

# For development
pip install meeet-trust[dev]
```

## Quick Start

```python
from meeet_trust import MeeetGuard

# Initialize the guard
guard = MeeetGuard(api_key="your_api_key")

# Use the decorator to protect any function
@guard.before_action(min_trust=0.7, max_sara=0.6)
def my_agent_task(agent_did: str):
    # Only runs if agent passes 7-gate check
    print("Agent verified! Proceeding with task...")
```

## Framework Adapters

### CrewAI

```python
from meeet_trust import MeeetGuard
from meeet_trust.adapters.crewai import create_meeet_task_hook

# Create the guard and hook
guard = MeeetGuard(api_key="your_api_key")
meeet_hook = create_meeet_task_hook(guard, min_trust=0.7)

# Use with CrewAI Task
from crewai import Task, Agent

researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks",
    backstory="You are a world-class researcher"
)

task = Task(
    description="Research AI safety papers",
    agent=researcher,
    hooks=[meeet_hook]  # Add the MEEET hook
)
```

Or use the protected task wrapper:

```python
from meeet_trust.adapters.crewai import MeeetProtectedTask

task = MeeetProtectedTask(
    description="Research task",
    agent=researcher,
    guard=guard,
    min_trust=0.7,
)
```

### AutoGen

```python
from meeet_trust import MeeetGuard
from meeet_trust.adapters.autogen import MeeetAutoGenMiddleware

# Create middleware
guard = MeeetGuard(api_key="your_api_key")
middleware = MeeetAutoGenMiddleware(
    guard,
    min_trust=0.7,
    check_on="both"  # Check on message and function calls
)

# Use with AutoGen agent
from autogen import ConversableAgent

agent = ConversableAgent(
    "researcher",
    llm_config={"model": "gpt-4"},
    middleware=[middleware]
)
```

Or use the protected agent wrapper:

```python
from meeet_trust.adapters.autogen import MeeetProtectedAgent

base_agent = ConversableAgent("researcher", llm_config={...})

protected_agent = MeeetProtectedAgent(
    base_agent,
    guard=guard,
    min_trust=0.7,
)
```

### LangGraph

```python
from meeet_trust import MeeetGuard
from meeet_trust.adapters.langgraph import create_trust_node, trust_condition
from langgraph.graph import StateGraph

# Create trust node
guard = MeeetGuard(api_key="your_api_key")
trust_node = create_trust_node(guard, min_trust=0.7)

# Define your state
class AgentState(dict):
    pass

# Build the graph
graph = StateGraph(AgentState)
graph.add_node("trust_check", trust_node)
graph.add_node("agent_action", your_agent_node)

# Add conditional routing
graph.add_conditional_edges(
    "trust_check",
    trust_condition,
    {
        "proceed": "agent_action",
        "blocked": "handle_blocked",
    }
)
```

Or use the trustable node decorator:

```python
from meeet_trust.adapters.langgraph import MeeetTrustableNode

@MeeetTrustableNode(guard, min_trust=0.7)
def my_agent_node(state):
    # This only runs if trust verification passes
    return {"result": "action completed"}
```

## API Reference

### MeeetGuard

The main class for trust verification.

```python
guard = MeeetGuard(
    api_key="your_api_key",
    trust_api_url="https://meeet.world/api/trust",  # Optional
    sara_api_url="https://meeet.world/api/sara",    # Optional
    default_min_trust=0.5,    # Default minimum trust score
    default_max_sara=0.6,     # Default maximum SARA risk
    block_on_fail=True,       # Raise exception on trust failure
)
```

#### Methods

- `verify_trust(agent_did, min_trust, max_sara)` — Returns TrustResult
- `before_action(min_trust, max_sara)` — Decorator for functions
- `check_and_raise(agent_did, min_trust, max_sara)` — Manual check with exception

### TrustResult

```python
@dataclass
class TrustResult:
    agent_did: str
    trust_score: float      # 0.0 to 1.0
    sara_risk: float        # 0.0 to 1.0
    passed: bool            # True if both checks pass
    blocked: bool           # True if action should be blocked
    message: str            # Human-readable message
    raw_response: dict      # Raw API response
```

## Configuration

### Trust Thresholds

| Threshold | Default | Description |
|-----------|---------|-------------|
| `min_trust` | 0.5 | Minimum trust score (0.0-1.0) |
| `max_sara` | 0.6 | Maximum SARA risk (0.0-1.0) |

### API Endpoints

By default, the following endpoints are used:
- Trust API: `https://meeet.world/api/trust/{agent_did}`
- SARA API: `https://meeet.world/api/sara/{agent_did}`

You can customize these via the `trust_api_url` and `sara_api_url` parameters.

## Logging

All trust checks are logged. Configure logging:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Testing

Run tests with:

```bash
pytest meeet_trust/tests/
```

## Requirements

- Python 3.8+
- No external dependencies (uses standard library only)

Optional dependencies for specific frameworks:
- CrewAI: `crewai>=0.50.0`
- AutoGen: `pyautogen>=0.2.0`
- LangGraph: `langgraph>=0.0.20`

## Links

- 🌐 [MEEET World](https://meeet.world)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 📖 [7-Gate Documentation](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)

## License

MIT License — see [LICENSE](LICENSE) for details.
