# MEEET Trust Guard

AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph.

This package provides trust verification for AI agents using the MEEET 7-gate trust API. Before any agent action, it checks the trust score and SARA risk assessment.

## Installation

```bash
pip install meeet-trust
```

Or install from source:

```bash
pip install git+https://github.com/alxvasilevvv/meeet-solana-state.git#subdirectory=meeet_trust
```

## Quick Start

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_api_key")

@guard.before_action(min_trust=0.7, max_sara_risk=0.6)
def my_agent_task(agent_did: str, query: str):
    # Only runs if agent passes 7-gate check
    return f"Researching: {query}"
```

## Features

- **Trust Score Verification**: Check agent trust score (0.0-1.0) before actions
- **SARA Risk Assessment**: Block high-risk agents (threshold 0.0-1.0)
- **Logging**: All trust checks are logged
- **Multi-Framework Support**: CrewAI, AutoGen, and LangGraph adapters

## API

### MeeetGuard

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(
    api_key="your_api_key",
    base_url="https://meeet.world/api",  # Default
    min_trust=0.5,   # Default minimum trust score
    max_sara_risk=0.6,  # Default maximum SARA risk
    log_requests=True,  # Log all trust checks
)
```

### Methods

#### `check_trust(agent_did: str) -> TrustResult`

Check trust score for an agent by DID.

```python
result = guard.check_trust("did:meeet:agent123")
print(f"Trust: {result.trust_score}, SARA: {result.sara_risk}")
```

#### `verify(agent_did: str, min_trust: float, max_sara_risk: float) -> TrustResult`

Verify trust with threshold checks. Raises `TrustCheckError` if blocked.

```python
try:
    result = guard.verify("did:meeet:agent123", min_trust=0.7, max_sara_risk=0.6)
    print(f"Verified! Trust: {result.trust_score}")
except TrustCheckError as e:
    print(f"Blocked: {e}")
```

#### `before_action(min_trust: float, max_sara_risk: float, agent_did_param: str)`

Decorator for CrewAI task functions.

```python
@guard.before_action(min_trust=0.7, max_sara_risk=0.6, agent_did_param="agent_did")
def research_task(agent_did: str, query: str):
    # Only runs if agent passes trust check
    return f"Researching: {query}"

# Call with agent_did
result = research_task("did:meeet:agent123", "climate change")
```

#### `crewai_hook(min_trust: float, max_sara_risk: float)`

Create a CrewAI before_task hook.

```python
from crewai import Agent

guard = MeeetGuard(api_key="your_key")

researcher = Agent(
    role="Researcher",
    goal="Research topics",
    backstory="You are a researcher",
    before_task=guard.crewai_hook(min_trust=0.7)
)
```

#### `autogen_middleware(min_trust: float, max_sara_risk: float)`

Create an AutoGen middleware.

```python
from autogen import ConversableAgent

guard = MeeetGuard(api_key="your_key")

agent = ConversableAgent(
    "assistant",
    llm_config={"model": "gpt-4"},
    middleware=guard.autogen_middleware(min_trust=0.7)
)
```

#### `langgraph_node(min_trust: float, max_sara_risk: float)`

Create a LangGraph node.

```python
from langgraph.graph import StateGraph

guard = MeeetGuard(api_key="your_key")

graph = StateGraph(AgentState)
graph.add_node("trust_check", guard.langgraph_node(min_trust=0.7))
graph.add_edge("__start__", "trust_check")
```

## Response Types

### TrustResult

```python
@dataclass
class TrustResult:
    agent_did: str
    trust_score: float      # 0.0 to 1.0
    sara_risk: float        # 0.0 to 1.0
    passed: bool            # True if passed checks
    blocked_reason: str     # Reason if blocked
    raw_response: dict      # Raw API response
```

### TrustCheckError

Exception raised when trust check fails.

```python
from meeet_trust import TrustCheckError

try:
    guard.verify("did:meeet:agent123", min_trust=0.7)
except TrustCheckError as e:
    print(f"Blocked: {e}")
```

## MEEET Trust API

The guard calls `GET /api/trust/{agent_did}` with Bearer authentication.

Expected response:

```json
{
  "trust_score": 0.85,
  "sara_risk": 0.15,
  "agent_id": "did:meeet:agent123",
  "identity_verified": true,
  "authorization_status": "approved"
}
```

## Testing

```bash
pip install pytest
pytest tests/test_meeet_trust.py -v
```

## License

MIT