# meeet-trust

**MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph**

Connect MEEET's 7-gate trust verification system to your AI agent frameworks. Before any agent action, verify the agent's trust score and SARA risk level.

## Install

```bash
pip install meeet-trust
```

## Features

- 🔒 **Trust Score Verification** — Check agent trust before allowing actions
- 🛡️ **SARA Risk Assessment** — Block high-risk agents (risk > 0.6)
- 📊 **7-Gate Trust System** — L1-L6 trust levels with cryptographic identity
- 🔌 **Framework Adapters** — CrewAI, AutoGen, LangGraph support
- 📝 **Logging** — All trust checks logged for audit

## Quick Start

```python
from meeet_trust import MeeetGuard

# Initialize guard with your API key
guard = MeeetGuard(api_key="your_api_key")

# Use decorator to protect agent actions
@guard.before_action(min_trust=0.7, max_sara_risk=0.5)
def run_agent_task(agent_did: str):
    """This only runs if agent passes trust check."""
    print(f"Agent {agent_did} verified! Running task...")
    # Your agent logic here
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | required | MEEET API key |
| `min_trust` | 0.5 | Minimum trust score (0.0-1.0) |
| `max_sara_risk` | 0.6 | Maximum SARA risk threshold (0.0-1.0) |

## Framework Integrations

### CrewAI

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_api_key", min_trust=0.7)

# Create CrewAI agent with trust verification
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks from MEEET World",
    backstory="You are an AI researcher connected to MEEET World",
    tools=[...],
    before_task=guard.crewai_hook(min_trust=0.7)
)

# Tasks will automatically verify trust before execution
task = Task(
    description="Research quantum computing breakthroughs",
    agent=researcher
)
```

### AutoGen

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_api_key", min_trust=0.7)

# Create AutoGen agent with trust middleware
agent = ConversableAgent(
    name="researcher",
    llm_config={"config_list": [...]},
    # Middleware blocks untrusted agents
    middleware=[guard.autogen_middleware(min_trust=0.7)]
)

# Messages from untrusted agents will be blocked
```

### LangGraph

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_api_key", min_trust=0.7)

# Create trust verification node
def verify_trust(state: dict) -> dict:
    """LangGraph node that verifies agent trust."""
    agent_did = state.get("agent_did")
    result = guard.check_trust(agent_did, min_trust=0.7)
    
    return {
        **state,
        "trust_verified": result["passed"],
        "trust_score": result["trust_score"],
        "sara_risk": result["sara_risk"],
    }

# Add to your graph
graph = StateGraph(dict)
graph.add_node("verify", verify_trust)
graph.set_entry_point("verify")
```

## Direct API Usage

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_api_key")

# Check trust for a specific agent
result = guard.check_trust(
    agent_did="did:meeet:agent123",
    min_trust=0.7,
    max_sara_risk=0.5
)

print(f"Passed: {result['passed']}")
print(f"Trust Score: {result['trust_score']}")
print(f"SARA Risk: {result['sara_risk']}")
print(f"Trust Level: {result['level']}")
print(f"Gates Passed: {result['gates_passed']}")
```

## Response Format

```python
{
    "agent_did": "did:meeet:agent123",
    "trust_score": 0.85,      # 0.0 - 1.0
    "sara_risk": 0.2,         # 0.0 - 1.0
    "level": "L4",            # L1-L6
    "passed": True,
    "gates_passed": {
        "L1_identity": True,
        "L2_authorization": True,
        "L2_sara": True,
        "L3_audit": True,
        "L4_verification": True,
        "L5_social": True,
        "L6_economic": True
    }
}
```

## Error Handling

```python
from meeet_trust import (
    MeeetGuard, 
    TrustScoreTooLow, 
    SARARiskTooHigh,
    TrustCheckError
)

guard = MeeetGuard(api_key="your_api_key")

@guard.before_action(min_trust=0.7, block_on_fail=True)
def protected_task(agent_did):
    # This will raise an exception if trust check fails
    pass

try:
    protected_task("did:meeet:agent123")
except TrustScoreTooLow as e:
    print(f"Agent trust too low: {e.score} < {e.threshold}")
except SARARiskTooHigh as e:
    print(f"SARA risk too high: {e.risk} > {e.threshold}")
except TrustCheckError as e:
    print(f"Trust check failed: {e}")
```

## Logging

All trust checks are logged. Configure logging:

```python
import logging

logging.basicConfig(level=logging.INFO)
# Or use custom configuration
logger = logging.getLogger("meeet_trust")
logger.setLevel(logging.DEBUG)
```

## Trust Levels

| Level | Name | Description |
|-------|------|-------------|
| L1 | Identity | Cryptographic identity (Ed25519 DID) |
| L2 | Authorization | APS pre-execution check |
| L2.5 | SARA Guard | Risk assessment |
| L3 | Audit | Signet hash-chained receipts |
| L4 | Verification | Peer review + VeroQ |
| L5 | Social | ClawSocial behavioral scoring |
| L6 | Economic | $MEEET staking |

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Developer Portal](https://meeet.world/developer)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)
