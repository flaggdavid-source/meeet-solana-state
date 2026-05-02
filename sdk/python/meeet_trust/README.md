# meeet-trust

**🛡️ MEEET Trust Guard — AI agent trust verification for CrewAI, AutoGen, and LangGraph**

Verify agent trust scores and SARA risk before allowing AI agent actions to proceed.

## Install

```bash
pip install meeet-trust
```

## Quick Start

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

@guard.before_action(min_trust=0.7, max_sara=0.6)
def my_agent_task(agent_did):
    # Only runs if agent passes 7-gate trust check
    pass
```

## Features

- **Trust Score Verification** — Check MEEET 7-gate trust score before agent actions
- **SARA Risk Blocking** — Block agents with SARA risk > 0.6
- **Framework Adapters** — CrewAI, AutoGen, and LangGraph integrations
- **Caching** — Built-in cache to reduce API calls
- **Logging** — Full logging of all trust checks

## API

### MeeetGuard

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(
    api_key="your_key",           # Optional: uses MEEET_API_KEY env var
    api_url="https://meeet.world/api",  # Custom API URL
    default_min_trust=0.5,        # Default minimum trust (0.0-1.0)
    default_max_sara=0.6,        # Default max SARA risk (0.0-1.0)
)
```

### Methods

| Method | Description |
|--------|-------------|
| `check_trust(agent_did, min_trust, max_sara)` | Check trust thresholds |
| `before_action(min_trust, max_sara)` | Decorator for agent actions |
| `before_task(min_trust, max_sara)` | CrewAI before_task hook |
| `as_langgraph_node(min_trust, max_sara)` | LangGraph trust node |
| `as_autogen_middleware(min_trust, max_sara)` | AutoGen middleware |

## CrewAI Integration

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

@guard.before_task(min_trust=0.7)
def research_task(task_input):
    # Only runs if agent passes trust check
    pass

# Use as CrewAI hook
agent = Agent(
    role="Researcher",
    goal="Complete research tasks",
    before_task_hook=research_task,
)
```

## AutoGen Integration

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

agent = ConversableAgent(
    "researcher",
    system_message="You are a research agent.",
)

agent.register_hook(
    "message_processing",
    guard.as_autogen_middleware(min_trust=0.7, max_sara=0.6)
)
```

## LangGraph Integration

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="key")

graph = StateGraph(AgentState)
graph.add_node("trust_check", guard.as_langgraph_node("trust", min_trust=0.7))
graph.add_edge("__start__", "trust")
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MEEET_API_KEY` | Your MEEET API key |

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)
