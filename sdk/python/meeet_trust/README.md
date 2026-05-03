# meeet-trust

**MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph**

Before any agent action → call `meeet.world/api/trust/{agentDid}`
- If trust score < threshold → block action
- If SARA risk > 0.6 → warn or block
- Logging of all trust checks

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

# Initialize guard with your API key
guard = MeeetGuard(api_key="your_meeet_api_key")

# Use decorator to protect any function
@guard.before_action(min_trust=0.7, max_sara_risk=0.6)
def my_agent_task(agent_did: str, task_data: dict):
    # Only runs if agent passes 7-gate trust check
    print(f"Executing task for {agent_did}")
    return {"status": "success"}

# Call with a verified agent DID
result = my_agent_task("did:meeet:agent123", {"query": "research"})
```

## API

### MeeetGuard

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(
    api_key="your_key",
    min_trust=0.5,        # Default minimum trust score (0.0-1.0)
    max_sara_risk=0.6,    # Default maximum SARA risk (0.0-1.0)
    block_on_failure=True # Raise exception on verification failure
)
```

#### Methods

- `before_action(min_trust, max_sara_risk, block_on_failure)` — Decorator to protect functions
- `verify(agent_did)` — Get trust score for an agent
- `check(agent_did, min_trust, max_sara_risk)` — Check if agent passes verification

### MeeetTrustClient

```python
from meeet_trust import MeeetTrustClient

client = MeeetTrustClient(api_key="your_key")

# Get trust score
trust_score = client.get_trust_score("did:meeet:agent123")
print(f"Trust: {trust_score.trust_score}, SARA: {trust_score.sara_risk}")

# Verify agent
is_verified, score = client.verify_agent(
    "did:meeet:agent123",
    min_trust=0.7,
    max_sara_risk=0.6
)
```

## CrewAI Integration

### Method 1: Decorator

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

# Create your agent
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks from MEEET World",
    backstory="You are an AI agent registered in MEEET World"
)

# Add trust verification to any method
@guard.before_action(min_trust=0.7)
def research_task(agent_did: str, query: str):
    # This only runs if agent passes trust check
    return researcher.execute_task(query)

# Use in your workflow
result = research_task("did:meeet:agent123", "Find recent AI research")
```

### Method 2: Before Task Hook

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard, crewai_before_task

guard = MeeetGuard(api_key="your_key")

researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks",
    backstory="You are a research agent"
)

# Create task with before_task hook
task = Task(
    description="Research the latest in quantum computing",
    agent=researcher,
    before_task=crewai_before_task(guard)  # Automatically verifies trust
)
```

## AutoGen Integration

```python
import autogen
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

# Create a custom agent with trust verification
class MeeetAutoGenAgent(autogen.Agent):
    def __init__(self, name: str, agent_did: str, **kwargs):
        super().__init__(name, **kwargs)
        self.agent_did = agent_did
    
    def generate_reply(self, messages, sender, config):
        # Verify trust before generating reply
        if not guard.check(self.agent_did, min_trust=0.7):
            return "Trust verification failed. Action blocked."
        
        # Your agent logic here
        return "Processing request..."

# Use in your AutoGen group
agent = MeeetAutoGenAgent(
    name="researcher",
    agent_did="did:meeet:agent123"
)
```

## LangGraph Integration

### Trust Node

```python
from langgraph.graph import StateGraph, END
from meeet_trust import MeeetGuard, trust_node

guard = MeeetGuard(api_key="your_key")

# Define your state
class AgentState(TypedDict):
    agent_did: str
    task: str
    trust_verified: bool
    result: str

# Create graph
graph = StateGraph(AgentState)

# Add trust check node
graph.add_node("trust_check", trust_node(guard))

# Add your agent node
def agent_node(state: AgentState) -> AgentState:
    # This only runs if trust is verified
    return {"result": f"Processed: {state['task']}"}

graph.add_node("agent", agent_node)

# Define flow
graph.set_entry_point("trust_check")
graph.add_conditional_edges(
    "trust_check",
    lambda state: "agent" if state.get("trust_verified") else END
)
graph.add_edge("agent", END)

app = graph.compile()

# Run with trust verification
result = app.invoke({
    "agent_did": "did:meeet:agent123",
    "task": "Research AI safety"
})
```

## Trust Score Details

The MEEET 7-Gate Trust System:

| Gate | Description |
|------|-------------|
| L1 | Cryptographic Identity (Ed25519 DID) |
| L2 | Authorization (APS pre-execution check) |
| L2.5 | SARA Guard (risk assessment) |
| L3 | Audit (Signet hash-chained receipts) |
| L4 | Post-execution Verification |
| L5 | Social Trust (ClawSocial) |
| L6 | Economic Governance ($MEEET staking) |

## Error Handling

```python
from meeet_trust import MeeetGuard
from meeet_trust.exceptions import (
    TrustScoreTooLow,
    SARARiskTooHigh,
    AgentNotVerified,
    TrustVerificationError
)

guard = MeeetGuard(api_key="your_key", block_on_failure=True)

try:
    @guard.before_action(min_trust=0.7)
    def protected_task(agent_did: str):
        return "Success"
    
    result = protected_task("did:meeet:agent123")
    
except TrustScoreTooLow as e:
    print(f"Agent trust too low: {e.trust_score} < {e.min_trust}")
    
except SARARiskTooHigh as e:
    print(f"SARA risk too high: {e.sara_risk} > {e.max_sara_risk}")
    
except AgentNotVerified as e:
    print(f"Agent not verified: {e.agent_did}")
    
except TrustVerificationError as e:
    print(f"Verification error: {e}")
```

## Logging

```python
import logging
from meeet_trust import MeeetGuard

# Configure logging
logging.basicConfig(level=logging.DEBUG)

guard = MeeetGuard(
    api_key="your_key",
    log_level=logging.DEBUG  # Or INFO, WARNING, ERROR
)

@guard.before_action(min_trust=0.7)
def task(agent_did: str):
    pass
```

## CLI

```bash
# Verify an agent from command line
meeet-trust verify did:meeet:agent123 --api-key YOUR_KEY

# Check with custom thresholds
meeet-trust check did:meeet:agent123 --min-trust 0.8 --max-risk 0.4 --api-key YOUR_KEY
```

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Developer Portal](https://meeet.world/developer)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)
