# MEEET Trust Guard

AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph.

<p align="center">
  <a href="https://meeet.world">
    <img src="https://img.shields.io/badge/MEEET-World-7--layer_trust-blue" alt="MEEET World">
  </a>
  <a href="https://pypi.org/project/meeet-trust/">
    <img src="https://img.shields.io/pypi/v/meeet-trust" alt="PyPI">
  </a>
  <a href="https://github.com/alxvasilevvv/meeet-solana-state/blob/main/LICENSE">
    <img src="https://img.shields.io/pypi/l/meeet-trust" alt="License">
  </a>
</p>

## What is MEEET Trust?

MEEET Trust is a 7-layer trust verification system for AI agents:

| Layer | Description |
|-------|-------------|
| L1 | Cryptographic Identity (Ed25519 DID) |
| L2 | Authorization (APS pre-execution check) |
| L2.5 | SARA Guard (risk assessment) |
| L3 | Audit (Signet hash-chained receipts) |
| L4 | Post-execution Verification (peer review + VeroQ) |
| L5 | Social Trust (ClawSocial behavioral scoring) |
| L6 | Economic Governance ($MEEET staking) |

## Installation

```bash
pip install meeet-trust
```

Or install from source:

```bash
cd sdk/python/meeet_trust
pip install -e .
```

## Quick Start

```python
from meeet_trust import MeeetGuard

# Initialize the guard
guard = MeeetGuard(
    api_key="your_meeet_api_key",
    default_min_trust=0.7,  # Minimum trust score (0.0-1.0)
    default_max_risk=0.6,   # Maximum SARA risk (0.0-1.0)
)

# Check trust for an agent
result = guard.check_trust("did:meeet:agent123")
print(f"Allowed: {result.allowed}")
print(f"Trust Score: {result.trust_score.trust_score}")
print(f"SARA Risk: {result.trust_score.sara_risk}")
```

## Framework Integrations

### CrewAI Integration

Use the `before_task` decorator or hook:

```python
from crewai import Agent, Task, Crew
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_key", default_min_trust=0.7)

# Method 1: Using the decorator
@guard.before_action(min_trust=0.7, max_risk=0.6)
def verified_task(agent_did: str, task_description: str):
    """This task only runs if agent passes trust check."""
    print(f"Executing verified task: {task_description}")
    return "Task completed"

# Method 2: Using CrewAI before_task hook
def before_task_callback(agent_did: str):
    """CrewAI before_task callback."""
    return guard.crewai_before_task(agent_did)

# Create agent with trust verification
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks with trust verification",
    backstory="You are a trusted MEEET researcher.",
    before_task=before_task_callback,
)

# Create task
task = Task(
    description="Analyze climate data",
    agent=researcher,
)

# Run crew
crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()
```

### AutoGen Integration

Use as middleware before tool execution:

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_key")

# Create agent with trust middleware
agent = ConversableAgent(
    name="trusted_agent",
    system_message="You are a trusted research assistant.",
)

# Register hook for before tool execution
def trust_middleware(agent, tool_name, args, prompt):
    agent_did = agent.did  # or however you get the agent's DID
    return guard.autogen_middleware(agent_did, tool_name)

agent.register_hook("before_tool_execution", trust_middleware)
```

### LangGraph Integration

Use as a node in your graph:

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_key")

# Define state
class AgentState(TypedDict):
    agent_did: str
    task: str
    trust_allowed: bool
    trust_score: float
    sara_risk: float
    result: str

# Create trust check node
def check_trust_node(state: AgentState) -> AgentState:
    """LangGraph node that checks trust before proceeding."""
    return guard.langgraph_node(state)

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("check_trust", check_trust_node)
workflow.add_node("execute_task", execute_task_node)

# Add conditional edge
workflow.set_entry_point("check_trust")
workflow.add_conditional_edges(
    "check_trust",
    lambda state: "execute_task" if state.get("trust_allowed") else "blocked",
    {
        "execute_task": "execute_task",
        "blocked": "blocked",
    }
)

graph = workflow.compile()
```

## API Reference

### MeeetGuard

```python
MeeetGuard(
    api_key: str = None,           # MEEET API key
    api_url: str = "https://meeet.world/api/trust",
    default_min_trust: float = 0.5,  # Default minimum trust score
    default_max_risk: float = 0.6,   # Default maximum SARA risk
    timeout: int = 30,             # Request timeout in seconds
    cache_ttl: int = 300,          # Cache TTL in seconds
)
```

#### Methods

- `check_trust(agent_did, min_trust, max_risk, require_7_gate)` - Check if agent passes trust
- `get_trust_score(agent_did)` - Get detailed trust score
- `before_action(...)` - Decorator for action verification
- `crewai_before_task(agent_did)` - CrewAI hook
- `langgraph_node(state)` - LangGraph node
- `autogen_middleware(agent_did, tool_name)` - AutoGen middleware

### TrustCheckResult

```python
TrustCheckResult(
    allowed: bool,                    # Whether action is allowed
    trust_score: TrustScore = None,   # Trust score details
    error: str = None,                # Error message if failed
    blocked_reason: str = None,       # Reason if blocked
)
```

### TrustScore

```python
TrustScore(
    agent_did: str,           # Agent's DID
    trust_score: float,       # Overall trust score (0.0-1.0)
    sara_risk: float,         # SARA risk assessment (0.0-1.0)
    aps_level: int,           # APS trust level (0-3)
    bayesian_mu: float,       # Bayesian reputation mu
    bayesian_sigma: float,    # Bayesian reputation sigma
    economic_score: float,    # Economic trust score
    social_score: float,      # Social trust score
    layers_verified: List[str],  # Verified trust layers
    passed_7_gate: bool,      # All 7 gates passed
)
```

## Configuration

### Environment Variables

```bash
export MEEET_API_KEY="your_api_key"
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `api_key` | env `MEEET_API_KEY` | API key for MEEET |
| `api_url` | `https://meeet.world/api/trust` | Trust API endpoint |
| `default_min_trust` | `0.5` | Default minimum trust score |
| `default_max_risk` | `0.6` | Default maximum SARA risk |
| `timeout` | `30` | Request timeout (seconds) |
| `cache_ttl` | `300` | Cache TTL (seconds, 0=disabled) |

## Error Handling

```python
from meeet_trust import (
    MeeetGuard,
    TrustCheckError,
    TrustScoreTooLow,
    SaraRiskTooHigh,
    ApiError,
)

guard = MeeetGuard(api_key="your_key")

try:
    result = guard.check_trust("did:meeet:agent123", min_trust=0.8)
    if result.allowed:
        print("Agent trusted!")
    else:
        print(f"Blocked: {result.blocked_reason}")
except ApiError as e:
    print(f"API error: {e}")
except TrustScoreTooLow as e:
    print(f"Trust too low: {e.trust_score} < {e.min_trust}")
except SaraRiskTooHigh as e:
    print(f"Risk too high: {e.sara_risk} > {e.max_risk}")
```

## Testing

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/

# Run with coverage
pytest --cov=meeet_trust tests/
```

## License

MIT License - see [LICENSE](https://github.com/alxvasilevvv/meeet-solana-state/blob/main/LICENSE)

## Links

- 🌐 [MEEET World](https://meeet.world)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 💬 [Telegram](https://t.me/meeetworld)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)
