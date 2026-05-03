# meeet-trust

**AI Agent Trust Verification Adapter for CrewAI, AutoGen, and LangGraph**

Connect MEEET 7-gate trust verification to your AI agent framework. Before any agent action, verify trust score and SARA risk to ensure safe and trustworthy AI operations.

## Features

- 🔒 **7-Gate Trust Verification** — Identity, Authority, Wallet State, Risk Assessment, Verification Accuracy, Behavioral Trust, Economic Accountability
- ⚡ **Trust Score Threshold** — Block actions from agents with low trust scores
- 📊 **SARA Risk Assessment** — Warn or block agents with high SARA risk (>0.6)
- 📝 **Detailed Logging** — Log all trust checks for audit trails
- 🛠️ **Multi-Framework Support** — CrewAI, AutoGen, LangGraph adapters included

## Install

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
    api_key="your_api_key",
    default_min_trust=0.7,  # Minimum trust score (0-1)
    default_max_sara=0.6,   # Maximum SARA risk (0-1)
)

# Verify an agent manually
response = guard.verify("did:meeet:agent_0x7a3f")
print(f"Trust score: {response.combined_trust_score}")
print(f"SARA risk: {response.sara_risk}")
```

## Framework Integrations

### CrewAI Integration

Use the `before_task` hook to verify trust before each task:

```python
from crewai import Agent, Task, Crew
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_api_key", default_min_trust=0.7)

# Create agent with trust verification
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks with verified trust",
    backstory="You are a research scientist in MEEET World.",
)

# Define before_task hook
@researcher.before_task
def check_trust(task):
    agent_did = task.agent.did  # Adjust based on your agent setup
    return guard.crewai_before_task_hook(agent_did)

# Create task
task = Task(
    description="Analyze research data",
    agent=researcher,
)

# Run crew
crew = Crew(agents=[researcher], tasks=[task])
crew.kickoff()
```

### AutoGen Integration

Use middleware for agent verification:

```python
import autogen
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_api_key", default_min_trust=0.7)

# Create agent with trust middleware
assistant = autogen.ConversableAgent(
    name="assistant",
    llm_config={"model": "gpt-4"},
    # Middleware checks trust before each message
    middleware=[lambda agent_did, msg: guard.autogen_middleware(agent_did, msg)]
)

# Start conversation
assistant.initiate_chat(
    recipient=assistant,
    message="Hello!"
)
```

### LangGraph Integration

Add a trust verification node to your graph:

```python
from langgraph.graph import StateGraph, END
from meeet_trust import MeeetGuard
from typing import TypedDict

# Define state
class AgentState(TypedDict):
    agent_did: str
    trust_score: float
    sara_risk: float
    trust_verified: bool

# Initialize guard
guard = MeeetGuard(api_key="your_api_key", default_min_trust=0.7)

# Create trust check node
def trust_check_node(state: AgentState) -> AgentState:
    """Verify trust before proceeding."""
    result = guard.langgraph_node(state)
    return result

def process_node(state: AgentState) -> AgentState:
    """Process task after trust verification."""
    # Your processing logic here
    return state

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("trust_check", trust_check_node)
workflow.add_node("process", process_node)

workflow.set_entry_point("trust_check")
workflow.add_edge("trust_check", "process")
workflow.add_edge("process", END)

graph = workflow.compile()

# Run graph
result = graph.invoke({
    "agent_did": "did:meeet:agent_0x7a3f",
})
```

## Decorator Usage

Use the `@before_action` decorator for function-level verification:

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_api_key")

@guard.before_action(min_trust=0.7, max_sara=0.6, agent_did_param="agent_did")
def execute_agent_task(agent_did: str, task_data: dict):
    """This only runs if agent passes trust check."""
    # Your agent task logic here
    print(f"Executing task for agent {agent_did}")

# Call the function
execute_agent_task(
    agent_did="did:meeet:agent_0x7a3f",
    task_data={"action": "analyze", "data": "..."}
)
```

## API Reference

### MeeetGuard

```python
MeeetGuard(
    api_key: str,                    # MEEET API key
    default_min_trust: float = 0.7,  # Default minimum trust score
    default_max_sara: float = 0.6,   # Default maximum SARA risk
    log_level: int = logging.INFO    # Logging level
)
```

### Methods

#### `verify(agent_did, min_trust=None, max_sara=None)`

Verify agent trust score and SARA risk.

**Parameters:**
- `agent_did` (str): Agent DID (e.g., "did:meeet:agent_0x7a3f")
- `min_trust` (float, optional): Minimum trust score threshold
- `max_sara` (float, optional): Maximum SARA risk threshold

**Returns:** `MeeetTrustResponse` with trust details

**Raises:** `TrustScoreTooLow` or `SARARiskTooHigh` if verification fails

#### `before_action(min_trust=None, max_sara=None, agent_did_param='agent_did')`

Decorator to verify trust before function execution.

#### `crewai_before_task_hook(agent_did)`

CrewAI before_task hook implementation.

#### `autogen_middleware(agent_did, message=None)`

AutoGen middleware for agent verification.

#### `langgraph_node(state)`

LangGraph node that calls MEEET 7-gate trust API.

### MeeetTrustResponse

```python
response.agent_did          # Agent DID
response.combined_trust_score  # Combined trust score (0-1)
response.sara_risk         # SARA risk score (0-1)
response.identity          # Identity gate status
response.authority         # Authority gate status
response.wallet_state      # Wallet state gate status
response.verification_accuracy  # Verification accuracy score
response.behavioral_trust  # Behavioral trust score
response.economic_accountability  # Economic accountability status
response.gates             # All gates as dict
```

### Exceptions

- `TrustVerificationError` — Base exception
- `TrustScoreTooLow` — Trust score below threshold
- `SARARiskTooHigh` — SARA risk above threshold

## Configuration

### Environment Variables

```bash
export MEEET_API_KEY="your_api_key"
```

### Logging

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Enable debug for detailed logs
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
```

## Testing

```bash
# Install test dependencies
pip install meeet-trust[dev]

# Run tests
pytest tests/

# Run with coverage
pytest --cov=meeet_trust tests/
```

## The 7 Gates

| Gate | Name | Description |
|------|------|-------------|
| 1 | Identity | DID + JWKS verification |
| 2 | Authority | Delegation scope + constraints |
| 3 | Wallet State | BoundWallet multichain |
| 4 | Risk Assessment | SARA 7 risk factors |
| 5 | Verification History | Peer review accuracy |
| 6 | Behavioral Trust | Interaction patterns |
| 7 | Economic Accountability | Staking + slashing |

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Developer Portal](https://meeet.world/developer)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)
