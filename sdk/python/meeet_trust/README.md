# meeet-trust

**MEEET Trust Guard — Verify agent trust before AI agent actions.**

Connect your AI agents to MEEET's 7-gate trust verification system. Block or warn on low trust scores and high SARA risk.

## Install

```bash
pip install meeet-trust
```

Or install from source:

```bash
cd sdk/python
pip install -e .
```

## Quick Start

```python
from meeet_trust import MeeetGuard

# Initialize the guard with your API key
guard = MeeetGuard(api_key="your_api_key")

# Use the decorator to protect agent actions
@guard.before_action(min_trust=0.7, max_sara=0.6)
def my_agent_task(agent_did):
    # Only runs if agent passes 7-gate check
    print(f"Executing task for {agent_did}")
    return "Task completed"
```

## Features

- **Trust Score Verification** — Call MEEET's trust API to get agent trust scores
- **SARA Risk Assessment** — Check SARA risk levels before allowing actions
- **Configurable Thresholds** — Set minimum trust and maximum SARA risk
- **Logging** — All trust checks are logged for audit purposes

## Framework Integrations

### CrewAI

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

# Create agent with trust verification hook
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks and submit discoveries",
    backstory="You are a research scientist",
    before_task_hook=guard.crewai_before_task(min_trust=0.7)
)

# Tasks will automatically verify trust before execution
task = Task(description="Research AI safety", agent=researcher)
```

### AutoGen

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

# Create agent with trust verification middleware
agent = ConversableAgent(
    name="assistant",
    llm_config={"model": "gpt-4"},
    middleware=guard.autogen_middleware(min_trust=0.7)
)
```

### LangGraph

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

def verify_trust_node(state):
    agent_did = state.get("agent_did", "")
    return guard.verify_trust(agent_did, min_trust=0.7)

# Add trust verification to your graph
graph = StateGraph()
graph.add_node("verify_trust", verify_trust_node)
graph.set_entry_point("verify_trust")
```

## API Reference

### MeeetGuard

```python
MeeetGuard(
    api_key: str,                          # MEEET API key
    trust_api_url: str = "...",            # Trust API endpoint
    sara_api_url: str = "...",            # SARA API endpoint
    default_min_trust: float = 0.5,        # Default minimum trust
    default_max_sara: float = 0.6,        # Default maximum SARA risk
    block_on_low_trust: bool = True,      # Block if trust too low
    block_on_high_sara: bool = False,     # Block if SARA too high
)
```

### Methods

- `verify_trust(agent_did, min_trust, max_sara)` — Verify trust and SARA risk
- `get_trust_score(agent_did)` — Get trust score from API
- `get_sara_risk(agent_did)` — Get SARA risk from API
- `before_action(min_trust, max_sara)` — Decorator for agent actions
- `crewai_before_task(min_trust, max_sara)` — CrewAI hook
- `autogen_middleware(min_trust, max_sara)` — AutoGen middleware
- `langgraph_node(min_trust, max_sara)` — LangGraph node

### Exceptions

- `TrustVerificationError` — Base exception
- `TrustScoreTooLow` — Trust below threshold
- `SARARiskTooHigh` — SARA risk above threshold

## Environment Variables

```bash
export MEET_API_KEY="your_api_key"
export MEET_TRUST_API_URL="https://meeet.world/api/trust"
export MEET_SARA_API_URL="https://meeet.world/api/sara"
```

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)