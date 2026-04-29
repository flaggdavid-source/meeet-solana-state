# MEEET Trust Guard

🛡️ AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

Connect your AI agents to MEEET's 7-gate trust verification system. Blocks actions from untrusted agents based on trust score and SARA risk assessment.

## Features

- 🔒 **Trust Score Verification** — Verify agents against MEEET's 7-gate trust system
- ⚠️ **SARA Risk Assessment** — Block high-risk agents (SARA risk > 0.6)
- 🔗 **Framework Integrations**
  - CrewAI `before_task` hook
  - AutoGen agent middleware
  - LangGraph verification node
- 📝 **Comprehensive Logging** — All trust checks logged
- 🧪 **Well Tested** — Unit tests with mocked API responses

## Installation

```bash
pip install meeet-trust
```

Or install from source:

```bash
cd meeet_trust
pip install -e .
```

## Quick Start

```python
from meeet_trust import MeeetGuard

# Initialize the guard with your API key
guard = MeeetGuard(
    api_key="your_api_key",
    min_trust=0.7,      # Minimum trust score required (0.0-1.0)
    max_sara_risk=0.5,  # Maximum SARA risk allowed (0.0-1.0)
)

# Check trust for an agent
result = guard.check_trust("did:meeet:agent123")

if result.passed:
    print(f"Agent trusted! Score: {result.trust_score}, Risk: {result.sara_risk}")
else:
    print(f"Agent blocked: {result.blocked_reason}")
```

## Usage Examples

### Decorator Pattern

Use the `@before_action` decorator to automatically verify trust before executing functions:

```python
from meeet_trust import MeeetGuard, TrustCheckFailedError

guard = MeeetGuard(api_key="your_key", min_trust=0.7)

@guard.before_action(min_trust=0.7)
def my_agent_task(agent_did: str):
    # Only runs if agent passes 7-gate check
    print(f"Executing task for {agent_did}")
    return "Task completed"

# This will raise TrustCheckFailedError if trust check fails
try:
    result = my_agent_task("did:meeet:agent123")
except TrustCheckFailedError as e:
    print(f"Task blocked: {e}")
```

### CrewAI Integration

Use the `crewai_before_task` hook to verify trust before each CrewAI task:

```python
from crewai import Agent, Task
from meeet_trust import MeeetGuard

# Initialize guard
guard = MeeetGuard(
    api_key="your_key",
    min_trust=0.7,
    max_sara_risk=0.5,
)

# Create your agent with before_task hook
researcher = Agent(
    role="Research Scientist",
    goal="Complete research tasks",
    backstory="You are a world-class researcher",
    before_task=lambda task: guard.crewai_before_task(
        agent_did="did:meeet:your_agent_id",
        task=task
    )
)

# Tasks will only execute if trust check passes
task = Task(
    description="Analyze climate data",
    agent=researcher,
)
```

### AutoGen Integration

Use the `autogen_middleware` method as a pre-processing hook:

```python
from autogen import ConversableAgent
from meeet_trust import MeeetGuard, TrustCheckFailedError

guard = MeeetGuard(api_key="your_key")

class VerifiedAgent(ConversableAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.meeet_guard = guard
    
    def generate_reply(self, messages, **kwargs):
        # Verify trust before processing
        try:
            result = self.meeet_guard.autogen_middleware(self.did)
            return super().generate_reply(messages, **kwargs)
        except TrustCheckFailedError as e:
            return f"Trust verification failed: {e}"

# Create verified agent
agent = VerifiedAgent(
    name="verified_assistant",
    llm_config={"model": "gpt-4"},
    system_message="You are a helpful assistant.",
)
```

### LangGraph Integration

Use the `langgraph_node` method as a verification node in your graph:

```python
from langgraph.graph import StateGraph
from meeet_trust import MeeetGuard, TrustCheckFailedError

guard = MeeetGuard(api_key="your_key")

def trust_check_node(state: dict):
    """LangGraph node that verifies trust before proceeding."""
    result = guard.langgraph_node(state)
    return state  # Pass through if trusted

def process_task_node(state: dict):
    """Process the task if trust check passed."""
    return {"result": "Task processed"}

# Build the graph
graph = StateGraph(dict)

graph.add_node("trust_check", trust_check_node)
graph.add_node("process_task", process_task_node)

graph.add_edge("__start__", "trust_check")
graph.add_edge("trust_check", "process_task")

# Compile and run
app = graph.compile()

# Run with agent DID in state
result = app.invoke({
    "agent_did": "did:meeet:agent123",
    "task": "analyze data"
})
```

## API Reference

### MeeetGuard

Main class for trust verification.

#### Constructor Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | str | Required | MEEET API key |
| `min_trust` | float | 0.5 | Minimum trust score (0.0-1.0) |
| `max_sara_risk` | float | 0.6 | Maximum SARA risk (0.0-1.0) |
| `trust_api_base` | str | https://meeet.world/api/trust | Trust API base URL |
| `log_level` | int | logging.INFO | Logging level |
| `fail_open` | bool | False | Allow action if API unavailable |

#### Methods

##### `check_trust(agent_did: str) -> TrustResult`

Check trust for an agent without blocking.

##### `before_action(min_trust=None, max_sara_risk=None) -> Callable`

Decorator to verify trust before executing a function.

##### `crewai_before_task(agent_did: str, task: Any) -> TrustResult`

CrewAI before_task hook integration.

##### `autogen_middleware(agent_did: str) -> TrustResult`

AutoGen agent verification middleware.

##### `langgraph_node(state: dict) -> TrustResult`

LangGraph node that verifies trust.

### TrustResult

Result of a trust verification check.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `agent_did` | str | Agent's DID |
| `trust_score` | float | Trust score (0.0-1.0) |
| `sara_risk` | float | SARA risk score (0.0-1.0) |
| `passed` | bool | Whether trust check passed |
| `blocked_reason` | str | Reason if blocked, None otherwise |
| `raw_response` | dict | Raw API response |

### Exceptions

| Exception | Description |
|-----------|-------------|
| `MeeetTrustError` | Base exception |
| `TrustCheckFailedError` | Trust check failed (trust score too low or SARA risk too high) |
| `MeeetAPIError` | MEEET API returned an error |

## Configuration

### Trust Thresholds

| Threshold | Recommended Value | Description |
|-----------|-------------------|-------------|
| `min_trust` | 0.5 - 0.8 | Minimum trust score required |
| `max_sara_risk` | 0.4 - 0.7 | Maximum SARA risk allowed |

### Fail Open Mode

Set `fail_open=True` to allow actions when the trust API is unavailable. This is useful for development but should be used carefully in production:

```python
guard = MeeetGuard(
    api_key="your_key",
    fail_open=True,  # Allow actions if API is down
)
```

## Logging

All trust checks are logged. Configure logging:

```python
import logging

# Set custom log level
logging.getLogger("meeet_trust").setLevel(logging.DEBUG)

# Or use MeeetGuard's log_level parameter
guard = MeeetGuard(
    api_key="your_key",
    log_level=logging.DEBUG,
)
```

## Testing

Install test dependencies:

```bash
pip install meeet-trust[dev]
```

Run tests:

```bash
pytest meeet_trust/tests/
```

## MEEET Trust Stack

The MEEET trust system uses a 7-gate verification:

1. **L1: Cryptographic Identity** — Ed25519 DID verification
2. **L2: Authorization** — APS pre-execution check
3. **L2.5: SARA Guard** — Risk assessment
4. **L3: Audit** — Signet hash-chained receipts
5. **L4: Post-execution Verification** — Peer review + VeroQ
6. **L5: Social Trust** — ClawSocial behavioral scoring
7. **L6: Economic Governance** — $MEEET staking

Learn more at [meeet.world/trust-api](https://meeet.world/trust-api)

## License

MIT License — see [LICENSE](LICENSE)

## Links

- 🌐 [meeet.world](https://meeet.world)
- 📖 [API Docs](https://meeet.world/trust-api)
- 💬 [Telegram](https://t.me/meeetworld)
- 🐙 [GitHub](https://github.com/alxvasilevvv/meeet-solana-state)