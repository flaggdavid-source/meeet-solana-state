"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(agent_did="did:meeet:agent123", min_trust=0.7)
    def my_agent_task():
        # Only runs if agent passes 7-gate trust check
        pass

Docs: https://meeet.world/trust-api
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

import json
import logging
import functools
import urllib.request
from dataclasses import dataclass, field
from typing import Optional, Callable, Dict, Any

# Default thresholds
DEFAULT_MIN_TRUST = 0.5
DEFAULT_MAX_SARA_RISK = 0.6
TRUST_API_BASE = "https://meeet.world/api/trust"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("meeet_trust")


@dataclass
class TrustResult:
    """Result of a trust check."""
    agent_did: str
    trust_score: float
    sara_risk: float
    passed: bool
    blocked_reason: Optional[str] = None
    raw_response: Dict = field(default_factory=dict)


class MeeetTrustError(Exception):
    """Base exception for MeeetTrust errors."""
    pass


class TrustCheckFailedError(MeeetTrustError):
    """Raised when trust check fails (trust score too low or SARA risk too high)."""
    def __init__(self, message: str, trust_result: TrustResult):
        super().__init__(message)
        self.trust_result = trust_result


class MeeetGuard:
    """
    MEEET Trust Guard — Verify AI agent trust before executing actions.
    
    Use as a decorator to wrap agent tasks with trust verification.
    Supports CrewAI before_task hooks, AutoGen middleware, and LangGraph nodes.
    
    Example:
        guard = MeeetGuard(api_key="your_key", min_trust=0.7, max_sara_risk=0.5)
        
        @guard.before_action(agent_did="did:meeet:agent123")
        def my_agent_task():
            # Only runs if agent passes trust check
            pass
    """
    
    def __init__(
        self,
        api_key: str,
        min_trust: float = DEFAULT_MIN_TRUST,
        max_sara_risk: float = DEFAULT_MAX_SARA_RISK,
        base_url: str = TRUST_API_BASE,
        log_level: int = logging.INFO
    ):
        """
        Initialize MeeetGuard.
        
        Args:
            api_key: MEEET API key for authentication
            min_trust: Minimum trust score required (0.0-1.0). Default: 0.5
            max_sara_risk: Maximum SARA risk threshold (0.0-1.0). Default: 0.6
            base_url: Base URL for trust API. Default: https://meeet.world/api/trust
            log_level: Logging level. Default: INFO
        """
        self.api_key = api_key
        self.min_trust = min_trust
        self.max_sara_risk = max_sara_risk
        self.base_url = base_url
        logger.setLevel(log_level)
        
        logger.info(f"MeeetGuard initialized with min_trust={min_trust}, max_sara_risk={max_sara_risk}")

    def check_trust(self, agent_did: str) -> TrustResult:
        """
        Check trust score for an agent.
        
        Args:
            agent_did: The agent's DID (e.g., did:meeet:agent123)
            
        Returns:
            TrustResult with trust_score, sara_risk, and passed status
        """
        url = f"{self.base_url}/{agent_did}"
        
        logger.info(f"Checking trust for agent: {agent_did}")
        
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                method="GET"
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            
            trust_score = data.get("trust_score", 0.0)
            sara_risk = data.get("sara_risk", 0.0)
            
            return TrustResult(
                agent_did=agent_did,
                trust_score=trust_score,
                sara_risk=sara_risk,
                passed=False,
                blocked_reason=None,
                raw_response=data
            )
            
        except urllib.error.HTTPError as e:
            logger.error(f"HTTP error checking trust for {agent_did}: {e.code}")
            return TrustResult(
                agent_did=agent_did,
                trust_score=0.0,
                sara_risk=1.0,
                passed=False,
                blocked_reason=f"HTTP error: {e.code}",
                raw_response={}
            )
        except urllib.error.URLError as e:
            logger.error(f"Network error checking trust for {agent_did}: {e.reason}")
            return TrustResult(
                agent_did=agent_did,
                trust_score=0.0,
                sara_risk=1.0,
                passed=False,
                blocked_reason=f"Network error: {e.reason}",
                raw_response={}
            )
        except Exception as e:
            logger.error(f"Error checking trust for {agent_did}: {str(e)}")
            return TrustResult(
                agent_did=agent_did,
                trust_score=0.0,
                sara_risk=1.0,
                passed=False,
                blocked_reason=f"Error: {str(e)}",
                raw_response={}
            )

    def _evaluate_trust(self, agent_did: str, trust_score: float, sara_risk: float) -> TrustResult:
        """Evaluate trust based on thresholds."""
        blocked_reason = None
        
        if trust_score < self.min_trust:
            blocked_reason = f"Trust score {trust_score:.2f} below minimum {self.min_trust}"
        elif sara_risk > self.max_sara_risk:
            blocked_reason = f"SARA risk {sara_risk:.2f} above maximum {self.max_sara_risk}"
        
        passed = blocked_reason is None
        
        result = TrustResult(
            agent_did=agent_did,
            trust_score=trust_score,
            sara_risk=sara_risk,
            passed=passed,
            blocked_reason=blocked_reason
        )
        
        if passed:
            logger.info(f"Trust check PASSED for {agent_did}: trust={trust_score:.2f}, sara={sara_risk:.2f}")
        else:
            logger.warning(f"Trust check FAILED for {agent_did}: {blocked_reason}")
        
        return result

    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara_risk: Optional[float] = None,
        agent_did: Optional[str] = None
    ) -> Callable:
        """
        Decorator to verify trust before executing an agent action.
        
        Use as a before_task hook in CrewAI, middleware in AutoGen, or node in LangGraph.
        
        Args:
            min_trust: Override minimum trust score for this specific action
            max_sara_risk: Override maximum SARA risk for this specific action
            agent_did: Agent DID to check (if not provided, tries to get from function args)
        
        Returns:
            Decorator function that wraps the action with trust verification
        
        Example:
            guard = MeeetGuard(api_key="key", min_trust=0.7)
            
            @guard.before_action(agent_did="did:meeet:agent123")
            def research_task():
                # Only runs if agent passes trust check
                pass
            
            # Or use with CrewAI:
            @guard.before_action(min_trust=0.8)
            def my_task(self):
                pass
        """
        _min_trust = min_trust if min_trust is not None else self.min_trust
        _max_sara_risk = max_sara_risk if max_sara_risk is not None else self.max_sara_risk
        
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Get agent_did from args/kwargs if not provided to decorator
                _agent_did = agent_did
                if _agent_did is None:
                    # Try to get from first argument (self for methods) or kwargs
                    if args:
                        if hasattr(args[0], 'agent_did'):
                            _agent_did = args[0].agent_did
                        elif hasattr(args[0], 'did'):
                            _agent_did = args[0].did
                    if _agent_did is None:
                        _agent_did = kwargs.get('agent_did') or kwargs.get('did')
                
                if _agent_did is None:
                    logger.warning("No agent_did provided, skipping trust check")
                    return func(*args, **kwargs)
                
                result = self.check_trust(_agent_did)
                result = self._evaluate_trust(_agent_did, result.trust_score, result.sara_risk)
                
                # Override thresholds for this specific check
                if result.trust_score < _min_trust:
                    result = TrustResult(
                        agent_did=_agent_did,
                        trust_score=result.trust_score,
                        sara_risk=result.sara_risk,
                        passed=False,
                        blocked_reason=f"Trust score {result.trust_score:.2f} below minimum {_min_trust}"
                    )
                elif result.sara_risk > _max_sara_risk:
                    result = TrustResult(
                        agent_did=_agent_did,
                        trust_score=result.trust_score,
                        sara_risk=result.sara_risk,
                        passed=False,
                        blocked_reason=f"SARA risk {result.sara_risk:.2f} above maximum {_max_sara_risk}"
                    )
                
                if not result.passed:
                    error_msg = f"Trust check failed for {_agent_did}: {result.blocked_reason}"
                    logger.error(f"BLOCKED: {error_msg}")
                    raise TrustCheckFailedError(error_msg, result)
                
                logger.info(f"Trust check passed for {_agent_did}, proceeding with action")
                return func(*args, **kwargs)
            
            return wrapper
        return decorator

    def crewai_before_task(self, agent_did: str) -> Callable:
        """
        Create a CrewAI before_task hook.
        
        Args:
            agent_did: The agent's DID to verify
        
        Returns:
            Callable that CrewAI will call before each task
        
        Example:
            from crewai import Agent, Task
            
            guard = MeeetGuard(api_key="key")
            
            researcher = Agent(
                role="Researcher",
                goal="Research topics",
                backstory="You are a research scientist"
            )
            
            task = Task(
                description="Research AI",
                agent=researcher,
                before_agent=guard.crewai_before_task("did:meeet:agent123")
            )
        """
        def before_task():
            result = self.check_trust(agent_did)
            result = self._evaluate_trust(agent_did, result.trust_score, result.sara_risk)
            if not result.passed:
                raise TrustCheckFailedError(
                    f"Trust check failed: {result.blocked_reason}", result
                )
            logger.info(f"CrewAI task proceeding for {agent_did}")
        
        return before_task

    def autogen_middleware(self, agent_did: str) -> Callable:
        """
        Create an AutoGen agent verification middleware.
        
        Args:
            agent_did: The agent's DID to verify
        
        Returns:
            Middleware function for AutoGen agent
        
        Example:
            from autogen import ConversableAgent
            
            guard = MeeetGuard(api_key="key")
            
            agent = ConversableAgent(
                name="researcher",
                system_message="You are a research scientist",
                middleware=[guard.autogen_middleware("did:meeet:agent123")]
            )
        """
        def middleware(agent, message, context):
            result = self.check_trust(agent_did)
            result = self._evaluate_trust(agent_did, result.trust_score, result.sara_risk)
            if not result.passed:
                raise TrustCheckFailedError(
                    f"Trust check failed: {result.blocked_reason}", result
                )
            logger.info(f"AutoGen agent {agent_did} trust verified")
            return True
        
        return middleware

    def langgraph_node(self, agent_did: str) -> Callable:
        """
        Create a LangGraph node for trust verification.
        
        Args:
            agent_did: The agent's DID to verify
        
        Returns:
            Node function for LangGraph
        
        Example:
            from langgraph.graph import StateGraph
            
            guard = MeeetGuard(api_key="key")
            
            def research_node(state):
                return {"result": "research data"}
            
            graph.add_node("verify", guard.langgraph_node("did:meeet:agent123"))
            graph.add_node("research", research_node)
            graph.add_edge("verify", "research")
        """
        def node(state: Dict[str, Any]) -> Dict[str, Any]:
            result = self.check_trust(agent_did)
            result = self._evaluate_trust(agent_did, result.trust_score, result.sara_risk)
            if not result.passed:
                raise TrustCheckFailedError(
                    f"Trust check failed: {result.blocked_reason}", result
                )
            logger.info(f"LangGraph node proceeding for {agent_did}")
            return state
        
        return node


# Quick start
if __name__ == "__main__":
    print("🛡️  MEEET Trust Guard")
    print("=" * 40)
    
    # Example usage
    guard = MeeetGuard(
        api_key="your_api_key",
        min_trust=0.7,
        max_sara_risk=0.5
    )
    
    print(f"Guard initialized: min_trust=0.7, max_sara_risk=0.5")
    print("\nUsage:")
    print("  @guard.before_action(agent_did='did:meeet:agent123')")
    print("  def my_task():")
    print("      pass")
    print("\n  # CrewAI:")
    print("  task = Task(..., before_agent=guard.crewai_before_task('did:meeet:agent123'))")
    print("\n  # AutoGen:")
    print("  agent = ConversableAgent(..., middleware=[guard.autogen_middleware('did:meeet:agent123')])")
    print("\n  # LangGraph:")
    print("  graph.add_node('verify', guard.langgraph_node('did:meeet:agent123'))")
