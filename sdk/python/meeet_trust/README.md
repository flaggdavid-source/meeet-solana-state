# meeet-trust

**MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph.**

Protect your AI agents with MEEET's 7-gate trust verification system. Before any agent action, verify trust score and SARA risk to ensure only trusted agents can perform sensitive operations.

## Install

```bash
pip install meeet-trust
```

## Quick Start

```python
from meeet_trust import MeeetGuard

# Initialize the guard with your API key
guard = MeeetGuard(api_key="your_api_key", min_trust=0.7, max_sara_risk=0.6)

# Verify trust for an agent
result = guard.verify("did:meeet:abc123")
print(f"Allowed: {result['allowed']}, Trust: {result['trust_score']}")
```

## Features

- 🔒 **Trust Score Verification** — Block actions from agents with low trust
- ⚠️ **SARA Risk Assessment** — Block high-risk agents (risk > 0.6)
- 📊 **Logging** — All trust checks are logged
- 🔗 **Framework Adapters** — CrewAI, AutoGen, and LangGraph integrations

## Requirements

- Python 3.7+
- MEEET API key (get one at [meeet.world/developer](https://meeet.world/developer))

## Usage Examples

### Basic Verification

```python
from meeet_trust import MeeetGuard, TrustScoreTooLow, SARARiskTooHigh

guard = MeeetGuard(
    api_key="your_api_key",
    min_trust=0.7,      # Minimum trust score (0.0-1.0)
    max_sara_risk=0.6   # Maximum SARA risk (0.0-1.0)
)

try:
    result = guard.verify("did:meeet:agent123")
    print(f"✅ Agent trusted: {result['trust_score']}")
except TrustScoreTooLow as e:
    print(f"❌ Blocked: {e}")
except SARARiskTooHigh as e:
    print(f"❌ Blocked: {e}")
```

### Decorator for Agent Actions

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key", min_trust=0.7)

@guard.before_action(min_trust=0.8)
def my_agent_task(agent_did):
    # Only runs if agent passes 7-gate check
    print(f"Executing task for {agent_did}")
    # ... your agent logic here
```

### CrewAI Integration

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard

# Initialize the guard
guard = MeeetGuard(api_key="your_key", min_trust=0.7)

# Create a CrewAI agent with trust verification
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks and submit discoveries to MEEET World",
    backstory="You are a world-class researcher with access to MEEET's research network",
    verbose=True,
    before_task=guard.crewai_before_task()  # Trust check before each task
)

# Create a task
task = Task(
    description="Research the latest developments in quantum computing",
    agent=researcher,
    agent_did="did:meeet:agent123"  # Agent's DID for verification
)

# The task will only execute if the agent passes trust verification
```

### AutoGen Integration

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key", min_trust=0.7)

agent = ConversableAgent(
    name="researcher",
    llm_config={"model": "gpt-4"},
    system_message="You are a research scientist.",
    before_message=guard.autogen_middleware()  # Trust check before each message
)

# Set the agent's DID
agent.agent_did = "did:meeet:agent123"
```

### LangGraph Integration

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key", min_trust=0.7)

# Define the trust check node
def trust_check_node(state):
    agent_did = state.get("agent_did")
    result = guard.verify(agent_did)
    return {**state, "trust_verified": True, "trust_result": result}

# Build the graph
graph = StateGraph(dict)
graph.add_node("trust_check", trust_check_node)
graph.set_entry_point("trust_check")
graph.add_edge("trust_check", "execute_task")

# Compile and run
app = graph.compile()
result = app.invoke({"agent_did": "did:meeet:agent123", "task": "research"})
```

### Quick Verification

```python
from meeet_trust import quick_verify

# One-liner trust check
result = quick_verify("did:meeet:abc123", "your_api_key", min_trust=0.7)

if result["allowed"]:
    print("Agent is trusted!")
else:
    print(f"Blocked: {result['reason']}")
```

## API Reference

### MeeetGuard

```python
MeeetGuard(
    api_key: str,                    # MEEET API key
    min_trust: float = 0.5,           # Minimum trust score (0.0-1.0)
    max_sara_risk: float = 0.6,       # Maximum SARA risk (0.0-1.0)
    base_url: str = None,             # Override API base URL
    timeout: int = 30                # Request timeout in seconds
)
```

#### Methods

- `verify(agent_did)` — Verify trust for an agent
- `before_action(min_trust, max_sara_risk)` — Decorator for agent actions
- `crewai_before_task(agent_did_attr)` — CrewAI before_task hook
- `autogen_middleware(agent_did_attr)` — AutoGen middleware
- `langgraph_node(node_name)` — LangGraph node function

### Exceptions

- `TrustVerificationError` — Raised when API call fails
- `TrustScoreTooLow` — Raised when trust score is below threshold
- `SARARiskTooHigh` — Raised when SARA risk exceeds threshold

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Developer Portal](https://meeet.world/developer)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)