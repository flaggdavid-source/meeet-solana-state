# MEEET Trust Guard

**AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph**

Connect your AI agent framework to MEEET's 7-gate trust verification system. Before any agent action executes, verify the agent's trust score and SARA risk level.

## Features

- 🔒 **Trust Score Verification** - Check agent trust before allowing actions
- 🛡️ **SARA Risk Assessment** - Block high-risk agents (configurable threshold)
- 📊 **7-Gate Verification** - Full trust stack verification
- 📝 **Logging** - All trust checks are logged
- 🔌 **Framework Adapters** - CrewAI, AutoGen, and LangGraph support

## Install

```bash
pip install meeet-trust
```

## Quick Start

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

@guard.before_action(min_trust=0.7)
def my_agent_task():
    # Only runs if agent passes 7-gate check
    pass
```

## Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | str | required | MEEET API key |
| `min_trust` | float | 0.7 | Minimum trust score (0.0-1.0) |
| `max_sara` | float | 0.6 | Maximum SARA risk (0.0-1.0) |
| `default_agent_did` | str | None | Default agent DID to verify |

## Usage Examples

### Basic Decorator

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(
    api_key="your_api_key",
    min_trust=0.7,
    max_sara=0.6
)

@guard.before_action(min_trust=0.8)
def sensitive_operation(agent_did: str):
    """This only runs if trust score >= 0.8"""
    print("Operation executed!")
```

### CrewAI Integration

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(
    api_key="your_key",
    min_trust=0.7,
    default_agent_did="did:meeet:agent123"
)

# Create agent with trust verification
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks",
    backstory="You are a research scientist...",
    before_task=guard.crewai_hook()
)

# Task will only execute if trust check passes
task = Task(
    description="Research the impact of AI on healthcare",
    agent=researcher
)
```

### AutoGen Integration

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

guard = MeeetGuard(
    api_key="your_key",
    min_trust=0.7
)

# Create agent with trust middleware
assistant = ConversableAgent(
    name="assistant",
    system_message="You are a helpful assistant.",
    llm_config={"model": "gpt-4"},
    verify_before_action=guard.autogen_middleware(agent_did="did:meeet:agent456")
)
```

### LangGraph Integration

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

guard = MeeetGuard(
    api_key="your_key",
    min_trust=0.7
)

# Create trust verification node
def verify_trust(state: dict) -> dict:
    """Node that verifies agent trust before proceeding"""
    return state

# Add to graph
graph = StateGraph(State)
graph.add_node("verify", guard.langgraph_node(agent_did="did:meeet:agent789"))
graph.set_entry_point("verify")
```

### Direct Client Usage

```python
from meeet_trust import MeeetTrustClient, TrustAction

client = MeeetTrustClient(api_key="your_key")

# Get trust score
score = client.get_trust_score("did:meeet:agent123")
print(f"Trust: {score.score}, SARA: {score.sara_risk}, Gates: {score.gates_passed}/{score.gates_total}")

# Verify agent for action
result = client.verify_agent(
    agent_did="did:meeet:agent123",
    min_trust=0.7,
    max_sara=0.6,
    action=TrustAction.TASK_EXECUTE
)

if result.allowed:
    print("Agent verified!")
else:
    print(f"Blocked: {result.reason}")
```

## Trust Thresholds

| Threshold | Value | Description |
|-----------|-------|-------------|
| `min_trust` | 0.0-1.0 | Minimum trust score required |
| `max_sara` | 0.0-1.0 | Maximum SARA risk allowed |

### Recommended Settings

- **High Security**: `min_trust=0.9`, `max_sara=0.3`
- **Standard**: `min_trust=0.7`, `max_sara=0.6`
- **Permissive**: `min_trust=0.5`, `max_sara=0.8`

## API Reference

### MeeetGuard

Main class for trust verification.

#### `__init__(api_key, min_trust=0.7, max_sara=0.6, default_agent_did=None, log_level=20)`

Initialize the guard with configuration.

#### `before_action(min_trust=None, max_sara=None, agent_did=None, action=TrustAction.ANY)`

Decorator that guards a function with trust verification.

#### `crewai_hook(agent_did=None)`

Returns a CrewAI-compatible before_task hook.

#### `autogen_middleware(agent_did=None)`

Returns an AutoGen-compatible middleware function.

#### `langgraph_node(agent_did=None)`

Returns a LangGraph node function for trust verification.

### MeeetTrustClient

Low-level client for direct API access.

#### `get_trust_score(agent_did)`

Get trust score for an agent.

#### `verify_agent(agent_did, min_trust, max_sara, action)`

Verify if an agent can perform an action.

## Logging

All trust checks are logged. Configure logging:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("meeet_trust")
logger.setLevel(logging.DEBUG)
```

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Developer Portal](https://meeet.world/developer)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)
