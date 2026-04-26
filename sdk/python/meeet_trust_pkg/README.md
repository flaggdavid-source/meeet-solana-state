# meeet-trust

**MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph**

Verify AI agent trust scores and SARA risk before allowing agent actions. Blocks or warns on low trust or high risk.

## Install

```bash
pip install meeet-trust
```

## Quick Start

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

@guard.before_action(min_trust=0.7)
def my_agent_task(agent_did):
    # Only runs if agent passes 7-gate check
    return "Task executed"
```

## Features

- **Trust Score Check**: Verify agent trust score (0.0-1.0) before execution
- **SARA Risk Assessment**: Block or warn if SARA risk exceeds threshold
- **Framework Integrations**: CrewAI, AutoGen, LangGraph
- **Logging**: All trust checks are logged
- **Configurable**: Set thresholds, blocking behavior, API endpoints

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | env `MEEET_API_KEY` | Your MEEET API key |
| `base_url` | `https://meeet.world/api/trust` | Trust API endpoint |
| `default_min_trust` | `0.5` | Minimum trust score (0.0-1.0) |
| `default_sara_threshold` | `0.6` | SARA risk threshold (0.0-1.0) |
| `block_on_fail` | `True` | Block action on failure |

## Usage Examples

### Direct Trust Check

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")
result = guard.check_trust(
    agent_did="did:meeet:abc123",
    min_trust=0.7,
    sara_threshold=0.6
)

if result["overall_passed"]:
    print("Agent trusted!")
else:
    print(f"Trust failed: {result}")
```

### CrewAI Integration

```python
from crewai import Agent
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks",
    backstory="You are a research scientist",
    before_task_hook=guard.crewai_before_task_hook
)
```

### AutoGen Integration

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

def trust_middleware(agent_did: str) -> bool:
    return guard.autogen_middleware(agent_did)

agent = ConversableAgent(
    name="researcher",
    llm_config={"model": "gpt-4"},
    middleware=[trust_middleware]
)
```

### LangGraph Integration

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

graph = StateGraph(AgentState)
graph.add_node("trust_check", guard.langgraph_node)
graph.add_edge("__start__", "trust_check")
# ... continue graph setup
```

## API Reference

### MeeetGuard

Main class for trust verification.

#### `__init__(api_key, base_url, default_min_trust, default_sara_threshold, block_on_fail, log_level)`

Initialize the guard with configuration.

#### `check_trust(agent_did, min_trust, sara_threshold, block_on_fail)`

Check trust for an agent. Returns dict with `trust_score`, `sara_risk`, `trust_passed`, `sara_passed`, `overall_passed`.

#### `before_action(min_trust, sara_threshold, block_on_fail)`

Decorator for wrapping agent functions with trust verification.

#### `crewai_before_task_hook(agent_did)`

CrewAI hook integration.

#### `autogen_middleware(agent_did)`

AutoGen middleware. Returns True if passed, False otherwise.

#### `langgraph_node(state)`

LangGraph node. Updates state with trust info.

### Exceptions

- `MeeetTrustError`: Base exception
- `TrustCheckFailedError`: Raised when trust check fails and blocking is enabled

## Links

- MEEET World: https://meeet.world
- Trust API: https://meeet.world/trust-api
- GitHub: https://github.com/alxvasilevvv/meeet-solana-state
