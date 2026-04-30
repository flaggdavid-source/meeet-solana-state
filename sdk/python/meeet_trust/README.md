# meeet-trust

**MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph**

Protect your AI agents with MEEET's 7-gate trust verification before executing any action.

## Install

```bash
pip install meeet-trust
```

## What is MEEET Trust?

MEEET Trust implements a 7-layer trust stack for AI agents:

- **L1**: Cryptographic Identity (Ed25519 DID)
- **L2**: Authorization (pre-execution check)
- **L2.5**: SARA Guard (risk assessment)
- **L3**: Audit (Signet hash-chained receipts)
- **L4**: Post-execution Verification
- **L5**: Social Trust (ClawSocial behavioral scoring)
- **L6**: Economic Governance ($MEEET staking)

## Quick Start

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

# Verify trust for an agent
result = guard.verify(
    agent_did="did:meeet:abc123",
    min_trust=0.7,
    max_sara_risk=0.6
)

print(f"Passed: {result['passed']}")
print(f"Trust Score: {result['trust_score']}")
print(f"SARA Risk: {result['sara_risk']}")
```

## Decorator Usage

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

@guard.before_action(min_trust=0.7, max_sara_risk=0.6)
def my_agent_task(agent_did="did:meeet:abc123"):
    # Only runs if agent passes trust check
    print("Task executed!")
    return {"status": "success"}

# This will check trust before running
result = my_agent_task(agent_did="did:meeet:abc123")
```

## CrewAI Integration

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(
    api_key="your_key",
    default_min_trust=0.7,
    default_max_sara_risk=0.6
)

# Create agent
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks with verified trust",
    verbose=True,
    backstory="You are a research scientist at MEEET World."
)

# Create task with trust verification
task = Task(
    description="Analyze recent papers on quantum computing",
    agent=researcher,
    guard=guard.crewai_before_task(agent_did="did:meeet:agent123")
)

# Or use as before_task hook
@guard.before_action(min_trust=0.8)
def research_task(agent_did="did:meeet:agent123"):
    # Your task logic here
    pass
```

## AutoGen Integration

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(
    api_key="your_key",
    default_min_trust=0.7,
    default_max_sara_risk=0.6
)

# Create agent with trust middleware
agent = ConversableAgent(
    name="research_agent",
    llm_config={"model": "gpt-4"},
    system_message="You are a research assistant."
)

# Use middleware to verify messages
def verify_message(message):
    result = guard.verify(
        agent_did="did:meeet:agent123",
        block_on_failure=False
    )
    if not result["passed"]:
        return {"blocked": True, "reason": result["reason"]}
    return {"blocked": False}

# Check trust before sending messages
result = guard.autogen_middleware("did:meeet:agent123")({"text": "Hello"})
```

## LangGraph Integration

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(
    api_key="your_key",
    default_min_trust=0.7,
    default_max_sara_risk=0.6
)

# Create trust verification node
def trust_node(state):
    """Node that verifies trust before proceeding."""
    return guard.langgraph_node(state_key="agent_did")(state)

# Build graph
graph = StateGraph()
graph.add_node("trust_check", trust_node)
graph.add_node("process", process_task)
graph.add_edge("__start__", "trust_check")
graph.add_conditional_edges(
    "trust_check",
    lambda s: "process" if not s.get("blocked", True) else "__end__"
)

# Run
result = graph.invoke({"agent_did": "did:meeet:agent123", "task": "research"})
```

## API Reference

### MeeetGuard

```python
MeeetGuard(
    api_key: str,                    # MEEET API key
    base_url: str = "...",           # Trust API base URL
    timeout: int = 30,               # Request timeout
    default_min_trust: float = 0.5,  # Default trust threshold
    default_max_sara_risk: float = 0.6,  # Default SARA risk threshold
    log_level: int = logging.INFO    # Logging level
)
```

### Methods

- `verify(agent_did, min_trust, max_sara_risk, block_on_failure)` — Verify trust
- `before_action(min_trust, max_sara_risk, agent_did_param)` — Decorator for trust verification
- `crewai_before_task(agent_did)` — CrewAI before_task hook
- `autogen_middleware(agent_did)` — AutoGen message middleware
- `langgraph_node(agent_did, state_key)` — LangGraph node function

### Exceptions

- `TrustVerificationError` — Base exception
- `TrustScoreTooLow` — Trust score below threshold
- `SARARiskTooHigh` — SARA risk exceeds threshold

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | required | MEEET API key |
| `base_url` | https://meeet.world/api/trust | Trust API endpoint |
| `timeout` | 30 | Request timeout (seconds) |
| `default_min_trust` | 0.5 | Minimum trust score (0.0-1.0) |
| `default_max_sara_risk` | 0.6 | Maximum SARA risk (0.0-1.0) |

## Thresholds

- **Trust Score**: 0.0 (untrusted) to 1.0 (fully trusted)
- **SARA Risk**: 0.0 (no risk) to 1.0 (high risk)

Recommended thresholds:
- High security: `min_trust=0.8`, `max_sara_risk=0.3`
- Standard: `min_trust=0.5`, `max_sara_risk=0.6`
- Relaxed: `min_trust=0.3`, `max_sara_risk=0.8`

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Developer Portal](https://meeet.world/developer)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)