# meeet-trust

**Trust verification adapter for AI agent frameworks — CrewAI, AutoGen, and LangGraph.**

Connect MEEET's 7-gate trust verification to your AI agents. Before any agent action → verify trust score and SARA risk.

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
guard = MeeetGuard(api_key="your_api_key")

# Verify an agent's trust score
result = guard.verify("did:meeet:agent123", min_trust=0.7, max_sara=0.6)
print(f"Trust: {result.trust_score}, SARA: {result.sara_risk}")
```

## Features

- 🔒 **Trust Score Verification** — Block agents with low trust scores
- ⚠️ **SARA Risk Assessment** — Block high-risk agents (risk > 0.6)
- 📊 **7-Gate Trust Check** — Full MEEET trust stack verification
- 📝 **Logging** — All trust checks logged for audit
- 🔌 **Framework Adapters** — CrewAI, AutoGen, LangGraph integrations

## API

### MeeetGuard

```python
from meeet_trust import MeeetGuard

guard = MeeetGuard(
    api_key="your_key",           # Optional: from MEEET_API_KEY env var
    base_url="https://meeet.world/api",  # API base URL
    timeout=30,                   # Request timeout
)
```

### verify()

Verify agent trust and SARA risk:

```python
result = guard.verify(
    agent_did="did:meeet:agent123",
    min_trust=0.7,        # Minimum trust score (0.0-1.0)
    max_sara=0.6,         # Maximum SARA risk (0.0-1.0)
)
# Returns TrustResponse with trust_score, sara_risk, trust_level, etc.
```

### before_action decorator

Decorator to protect functions with trust verification:

```python
@guard.before_action(min_trust=0.7, max_sara=0.6, agent_did_param="did")
def my_agent_task(did="did:meeet:agent123"):
    # Only runs if agent passes trust check
    pass
```

---

## Framework Integrations

### CrewAI — before_task Hook

```python
from crewai import Agent, Task, Crew
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(api_key="your_key")

# Create agent with trust verification
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks with trust verification",
    backstory="You are a trusted MEEET researcher",
    verbose=True
)

# Create task with trust callback
research_task = Task(
    description="Analyze recent advances in quantum computing",
    agent=researcher,
    callback=guard.crewai_taskDecorator(min_trust=0.7, max_sara=0.6)
)

# Run crew
crew = Crew(agents=[researcher], tasks=[research_task])
result = crew.kickoff()
```

### AutoGen — Agent Middleware

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

# Create middleware
trust_middleware = guard.autogen_middleware(min_trust=0.7, max_sara=0.6)

# Create agent with middleware
agent = ConversableAgent(
    name="researcher",
    llm_config={"model": "gpt-4"},
    hook=[trust_middleware]  # Add trust verification hook
)

# Agent will be verified before each message
response = agent.generate_reply(messages=[{"role": "user", "content": "Hello"}])
```

### LangGraph — Trust Node

```python
from langgraph.graph import StateGraph, END
from meeet_trust import MeeetGuard

guard = MeeetGuard(api_key="your_key")

# Define state
class AgentState(TypedDict):
    agent_did: str
    task: str
    trust_score: float
    sara_risk: float
    trust_verified: bool

# Create graph
graph = StateGraph(AgentState)

# Add trust verification node
graph.add_node("trust_check", guard.langgraph_node(
    min_trust=0.7,
    max_sara=0.6,
    state_key="agent_did"
))

# Add task execution node
def execute_task(state: AgentState) -> AgentState:
    # Your agent logic here
    return {**state, "result": "Task completed"}

graph.add_node("execute_task", execute_task)

# Define flow
graph.set_entry_point("trust_check")
graph.add_edge("trust_check", "execute_task")
graph.add_edge("execute_task", END)

# Compile and run
app = graph.compile()

result = app.invoke({
    "agent_did": "did:meeet:agent123",
    "task": "Research quantum computing"
})
```

---

## Trust Response

The `verify()` method returns a `TrustResponse` object:

```python
result = guard.verify("did:meeet:agent123")

print(result.agent_did)      # Agent DID
print(result.trust_score)    # Trust score (0.0-1.0)
print(result.sara_risk)      # SARA risk (0.0-1.0)
print(result.trust_level)    # Trust level: "trusted", "pending", "suspended"
print(result.capabilities)   # Agent capabilities
print(result.domains)        # Agent domains
print(result.reputation)     # Reputation score
print(result.is_verified)    # Is verified
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MEEET_API_KEY` | Your MEEET API key |
| `MEEET_API_URL` | Custom API URL (default: https://meeet.world/api) |

---

## Error Handling

```python
from meeet_trust import (
    MeeetGuard,
    TrustScoreTooLow,
    SaraRiskTooHigh,
    TrustApiError
)

guard = MeeetGuard(api_key="your_key")

try:
    result = guard.verify("did:meeet:agent123", min_trust=0.7)
except TrustScoreTooLow as e:
    print(f"Agent blocked: {e.score} < {e.threshold}")
except SaraRiskTooHigh as e:
    print(f"Agent too risky: {e.risk_score} > {e.threshold}")
except TrustApiError as e:
    print(f"API error: {e}")
```

---

## Testing

```bash
# Install with dev dependencies
pip install meeet-trust[dev]

# Run tests
pytest tests/

# Run with coverage
pytest --cov=meeet_trust tests/
```

---

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [Trust API Docs](https://meeet.world/trust-api)
- 📖 [7-Gate Trust](https://meeet.world/trust-api)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)
- 💬 [Telegram](https://t.me/meeetworld)
