# meeet-trust

**MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph**

Protect your AI agents with MEEET's 7-gate trust verification system. Before any agent action, verify trust score and SARA risk to ensure safe and trustworthy operations.

## Install

```bash
pip install meeet-trust
```

## Features

- 🔒 **Trust Score Verification** — Check agent trust score before actions
- ⚠️ **SARA Risk Assessment** — Block high-risk agents (SARA risk > 0.6)
- 📋 **7-Gate Trust API** — Full integration with MEEET's 7-gate trust system
- 🔗 **Framework Adapters** — CrewAI, AutoGen, and LangGraph support
- 📝 **Comprehensive Logging** — All trust checks are logged

## Quick Start

```python
from meeet_trust import MeeetGuard

# Initialize the guard with your API key
guard = MeeetGuard(api_key="your_meeet_api_key")

# Verify trust manually
response = guard.verify(
    agent_did="did:meeet:agent123",
    min_trust=0.7,
    max_risk=0.6
)
print(f"Trust score: {response.trust_score}, Verified: {response.verified}")
```

## Usage Examples

### CrewAI Integration

Use the `before_task` hook to verify trust before each task:

```python
from crewai import Agent, Task, Crew
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_key", default_min_trust=0.7)

# Create your agent
researcher = Agent(
    role="Researcher",
    goal="Research topics and submit discoveries",
    backstory="You are a research scientist"
)

# Create task with trust verification
task = Task(
    description="Research AI safety",
    agent=researcher,
    before_task=guard.crewai_before_task(min_trust=0.7)
)

# Or use the decorator directly
@guard.before_action(min_trust=0.7, agent_did_param="agent_did")
def my_research_task(agent_did: str, query: str):
    # Only runs if agent passes trust check
    result = perform_research(query)
    return result
```

### AutoGen Integration

Use middleware to verify trust before agent actions:

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

# Create agent with trust middleware
researcher = ConversableAgent(
    name="researcher",
    system_message="You are a research scientist",
    # Use middleware to verify trust before each message
    preprocess=guard.autogen_middleware(min_trust=0.7)
)

# The middleware will automatically verify trust before processing
```

### LangGraph Integration

Use a node to verify trust in your graph:

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

# Define your state
class State(dict):
    agent_did: str
    task: str

# Create verification node
verify_node = guard.langgraph_node(min_trust=0.7)

# Build your graph
graph = StateGraph(State)
graph.add_node("verify", verify_node)
graph.add_node("process", process_task)
graph.set_entry_point("verify")
graph.add_edge("verify", "process")

# Compile and run
app = graph.compile()
result = app.invoke({"agent_did": "did:meeet:agent123", "task": "research AI"})
```

### Using the Decorator Directly

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

@guard.before_action(min_trust=0.7, max_risk=0.6)
def protected_agent_action(agent_did: str, action: str, payload: dict):
    """
    This function will only execute if the agent passes trust verification.
    """
    # Perform the action
    return {"status": "success", "action": action}

# This will verify trust before executing
result = protected_agent_action(
    agent_did="did:meeet:agent123",
    action="submit_discovery",
    payload={"title": "My Discovery", "content": "..."}
)
```

## API Reference

### MeeetGuard

```python
MeeetGuard(
    api_key: str,                    # MEEET API key
    base_url: str = None,            # Override trust API URL
    timeout: int = 30,               # Request timeout
    default_min_trust: float = 0.5, # Default minimum trust score
    default_max_risk: float = 0.6,  # Default maximum SARA risk
    log_level: int = logging.INFO    # Logging level
)
```

### Methods

- `verify(agent_did, min_trust, max_risk, block_on_fail)` — Verify trust for an agent
- `before_action(min_trust, max_risk, block_on_fail, agent_did_param)` — Decorator for trust verification
- `crewai_before_task(min_trust, max_risk)` — CrewAI before_task hook
- `autogen_middleware(min_trust, max_risk)` — AutoGen middleware
- `langgraph_node(min_trust, max_risk)` — LangGraph node

### Exceptions

- `TrustVerificationError` — Base exception for trust verification errors
- `TrustScoreTooLow` — Raised when trust score is below threshold
- `SaraRiskTooHigh` — Raised when SARA risk exceeds threshold

## Trust Thresholds

| Threshold | Value | Description |
|-----------|-------|-------------|
| `min_trust` | 0.0 - 1.0 | Minimum trust score (default: 0.5) |
| `max_risk` | 0.0 - 1.0 | Maximum SARA risk (default: 0.6) |

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Developer Portal](https://meeet.world/developer)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)
