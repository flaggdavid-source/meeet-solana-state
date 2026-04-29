"""
MEEET Trust Guard — AI Agent Trust Verification

Connect your AI agents to MEEET 7-gate trust verification.
Blocks actions from untrusted agents based on trust score and SARA risk.

    from meeet_trust import MeeetGuard

    guard = MeeetGuard(api_key="your_key")

    @guard.before_action(min_trust=0.7)
    def my_agent_task():
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/trust-api
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

import json
import logging
import urllib.request
import urllib.error
from functools import wraps
from typing import Optional, Callable, Any, Dict, List
from dataclasses import dataclass, field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("meeet_trust")

# API Configuration
TRUST_API_BASE = "https://meeet.world/api/trust"
DEFAULT_MIN_TRUST = 0.5
DEFAULT_MAX_SARA_RISK = 0.6


@dataclass
class TrustResult:
    """Result of a trust verification check."""
    agent_did: str
    trust_score: float
    sara_risk: float
    passed: bool
    blocked_reason: Optional[str] = None
    raw_response: Dict = field(default_factory=dict)
    
    def __bool__(self) -> bool:
        return self.passed


class MeeetTrustError(Exception):
    """Base exception for MEEET Trust errors."""
    pass


class TrustCheckFailedError(MeeetTrustError):
    """Raised when trust check fails (trust score too low or SARA risk too high)."""
    def __init__(self, message: str, trust_result: TrustResult):
        super().__init__(message)
        self.trust_result = trust_result


class MeeetAPIError(MeeetTrustError):
    """Raised when MEEET API returns an error."""
    pass


class MeeetGuard:
    """
    MEEET Trust Guard — Verify agent trust before executing actions.
    
    Provides decorator/middleware patterns for:
    - CrewAI before_task hook
    - AutoGen agent verification
    - LangGraph node verification
    
    Example:
        guard = MeeetGuard(api_key="your_key")
        
        @guard.before_action(min_trust=0.7, max_sara_risk=0.5)
        def my_task():
            pass
    """
    
    def __init__(
        self,
        api_key: str,
        min_trust: float = DEFAULT_MIN_TRUST,
        max_sara_risk: float = DEFAULT_MAX_SARA_RISK,
        trust_api_base: str = TRUST_API_BASE,
        log_level: int = logging.INFO,
        fail_open: bool = False,
    ):
        """
        Initialize MEEET Trust Guard.
        
        Args:
            api_key: MEEET API key for authentication
            min_trust: Minimum trust score required (0.0-1.0). Default: 0.5
            max_sara_risk: Maximum SARA risk allowed (0.0-1.0). Default: 0.6
            trust_api_base: Base URL for trust API. Default: https://meeet.world/api/trust
            log_level: Logging level. Default: INFO
            fail_open: If True, allow action when API is unavailable. Default: False
        """
        self.api_key = api_key
        self.min_trust = min_trust
        self.max_sara_risk = max_sara_risk
        self.trust_api_base = trust_api_base
        self.fail_open = fail_open
        
        # Configure logger
        logger.setLevel(log_level)
        
        logger.info(
            f"MeeetGuard initialized: min_trust={min_trust}, "
            f"max_sara_risk={max_sara_risk}, fail_open={fail_open}"
        )
    
    def _call_trust_api(self, agent_did: str) -> TrustResult:
        """
        Call MEEET trust API for an agent.
        
        Args:
            agent_did: Agent's DID (did:meeet:...)
            
        Returns:
            TrustResult with trust score and SARA risk
            
        Raises:
            MeeetAPIError: If API returns an error
            MeeetTrustError: If API is unavailable and fail_open=False
        """
        url = f"{self.trust_api_base}/{agent_did}"
        
        logger.info(f"Calling trust API: {url}")
        
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                method="GET"
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
                
            logger.info(f"Trust API response for {agent_did}: {data}")
            
            return self._parse_trust_response(agent_did, data)
            
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            logger.error(f"Trust API HTTP error {e.code}: {error_body}")
            raise MeeetAPIError(f"Trust API error {e.code}: {error_body}")
            
        except urllib.error.URLError as e:
            logger.error(f"Trust API connection error: {e.reason}")
            if self.fail_open:
                logger.warning("fail_open=True, allowing action despite API error")
                return TrustResult(
                    agent_did=agent_did,
                    trust_score=1.0,  # Assume trusted when API unavailable
                    sara_risk=0.0,
                    passed=True,
                    raw_response={"error": str(e), "fail_open": True}
                )
            raise MeeetTrustError(f"Trust API unavailable: {e.reason}")
            
        except json.JSONDecodeError as e:
            logger.error(f"Trust API invalid JSON: {e}")
            raise MeeetAPIError(f"Invalid API response: {e}")
    
    def _parse_trust_response(self, agent_did: str, data: Dict) -> TrustResult:
        """
        Parse trust API response into TrustResult.
        
        Expected response format:
        {
            "agentDid": "did:meeet:...",
            "trustScore": 0.85,
            "saraRisk": 0.2,
            "gates": {...},
            ...
        }
        """
        trust_score = data.get("trustScore", data.get("trust_score", 0.0))
        sara_risk = data.get("saraRisk", data.get("sara_risk", 0.0))
        
        # Determine if action should be blocked
        blocked_reason = None
        passed = True
        
        if trust_score < self.min_trust:
            passed = False
            blocked_reason = f"Trust score {trust_score:.2f} below minimum {self.min_trust}"
            
        if sara_risk > self.max_sara_risk:
            passed = False
            reason = f"SARA risk {sara_risk:.2f} above maximum {self.max_sara_risk}"
            blocked_reason = reason if not blocked_reason else f"{blocked_reason}; {reason}"
        
        if not passed:
            logger.warning(f"Trust check FAILED for {agent_did}: {blocked_reason}")
        else:
            logger.info(f"Trust check PASSED for {agent_did}: score={trust_score}, risk={sara_risk}")
        
        return TrustResult(
            agent_did=agent_did,
            trust_score=trust_score,
            sara_risk=sara_risk,
            passed=passed,
            blocked_reason=blocked_reason,
            raw_response=data,
        )
    
    def check_trust(self, agent_did: str) -> TrustResult:
        """
        Check trust for an agent without blocking.
        
        Args:
            agent_did: Agent's DID (did:meeet:...)
            
        Returns:
            TrustResult with verification details
        """
        return self._call_trust_api(agent_did)
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara_risk: Optional[float] = None,
    ) -> Callable:
        """
        Decorator to verify trust before executing a function.
        
        Args:
            min_trust: Override default minimum trust score
            max_sara_risk: Override default maximum SARA risk
            
        Returns:
            Decorated function that only runs if trust check passes
            
        Example:
            guard = MeeetGuard(api_key="key")
            
            @guard.before_action(min_trust=0.7)
            def my_agent_task(agent_did):
                # Only runs if agent passes trust check
                pass
        """
        effective_min_trust = min_trust if min_trust is not None else self.min_trust
        effective_max_sara = max_sara_risk if max_sara_risk is not None else self.max_sara_risk
        
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(agent_did: str, *args, **kwargs) -> Any:
                logger.info(
                    f"Trust check for {func.__name__}: "
                    f"agent_did={agent_did}, min_trust={effective_min_trust}, "
                    f"max_sara_risk={effective_max_sara}"
                )
                
                # Create temporary guard with overridden thresholds
                temp_guard = MeeetGuard(
                    api_key=self.api_key,
                    min_trust=effective_min_trust,
                    max_sara_risk=effective_max_sara,
                    trust_api_base=self.trust_api_base,
                    fail_open=self.fail_open,
                )
                
                result = temp_guard._call_trust_api(agent_did)
                
                if not result.passed:
                    raise TrustCheckFailedError(
                        f"Trust check failed for {agent_did}: {result.blocked_reason}",
                        result
                    )
                
                # Call the original function
                return func(agent_did, *args, **kwargs)
            
            # Attach trust result to wrapper for inspection
            wrapper._trust_guard = self
            wrapper._min_trust = effective_min_trust
            wrapper._max_sara_risk = effective_max_sara
            
            return wrapper
        return decorator
    
    def crewai_before_task(self, agent_did: str, task: Any = None) -> TrustResult:
        """
        CrewAI before_task hook integration.
        
        Call this in your CrewAI agent's before_task callback:
        
            from crewai import Agent
            
            guard = MeeetGuard(api_key="key")
            
            @agent.before_task
            def verify_trust(task):
                return guard.crewai_before_task(agent.did, task)
        
        Args:
            agent_did: The agent's DID
            task: Optional task object for additional context
            
        Returns:
            TrustResult - raises TrustCheckFailedError if check fails
        """
        logger.info(f"CrewAI before_task hook: agent_did={agent_did}")
        result = self._call_trust_api(agent_did)
        
        if not result.passed:
            raise TrustCheckFailedError(
                f"Agent {agent_did} failed trust check: {result.blocked_reason}",
                result
            )
        
        return result
    
    def autogen_middleware(self, agent_did: str) -> TrustResult:
        """
        AutoGen agent verification middleware.
        
        Use as a pre-processing hook in AutoGen:
        
            from autogen import ConversableAgent
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="key")
            
            class VerifiedConversableAgent(ConversableAgent):
                def generate_reply(self, messages, **kwargs):
                    result = guard.autogen_middleware(self.did)
                    if result.passed:
                        return super().generate_reply(messages, **kwargs)
                    return "Trust verification failed. Action blocked."
        
        Args:
            agent_did: The agent's DID
            
        Returns:
            TrustResult - raises TrustCheckFailedError if check fails
        """
        logger.info(f"AutoGen middleware: agent_did={agent_did}")
        result = self._call_trust_api(agent_did)
        
        if not result.passed:
            raise TrustCheckFailedError(
                f"Agent {agent_did} failed trust check: {result.blocked_reason}",
                result
            )
        
        return result
    
    def langgraph_node(self, state: Dict) -> Dict:
        """
        LangGraph node that verifies trust before proceeding.
        
        Use in your LangGraph state graph:
        
            from meeet_trust import MeeetGuard
            from langgraph.graph import StateGraph
            
            guard = MeeetGuard(api_key="key")
            
            def trust_node(state):
                result = guard.langgraph_node(state)
                return state  # Pass through if trusted
            
            graph = StateGraph()
            graph.add_node("trust_check", trust_node)
            graph.add_edge("__start__", "trust_check")
        
        Args:
            state: LangGraph state dict with 'agent_did' key
            
        Returns:
            TrustResult - raises TrustCheckFailedError if check fails
            
        Raises:
            KeyError: If state doesn't contain 'agent_did'
        """
        agent_did = state.get("agent_did") or state.get("agentDid")
        if not agent_did:
            raise KeyError("State must contain 'agent_did' or 'agentDid'")
        
        logger.info(f"LangGraph node: agent_did={agent_did}")
        result = self._call_trust_api(agent_did)
        
        if not result.passed:
            raise TrustCheckFailedError(
                f"Agent {agent_did} failed trust check: {result.blocked_reason}",
                result
            )
        
        # Add trust result to state for downstream nodes
        state["_meeet_trust_result"] = result
        return state


# ═══ Convenience functions ═══

def check_agent_trust(
    agent_did: str,
    api_key: str,
    min_trust: float = DEFAULT_MIN_TRUST,
    max_sara_risk: float = DEFAULT_MAX_SARA_RISK,
) -> TrustResult:
    """
    Quick function to check trust for an agent.
    
    Args:
        agent_did: Agent's DID
        api_key: MEEET API key
        min_trust: Minimum trust score required
        max_sara_risk: Maximum SARA risk allowed
        
    Returns:
        TrustResult
    """
    guard = MeeetGuard(
        api_key=api_key,
        min_trust=min_trust,
        max_sara_risk=max_sara_risk,
    )
    return guard.check_trust(agent_did)


# ═══ Main example ═══
if __name__ == "__main__":
    print("🛡️  MEEET Trust Guard")
    print("=" * 40)
    
    # Example usage
    guard = MeeetGuard(
        api_key="demo_key",
        min_trust=0.7,
        max_sara_risk=0.5,
    )
    
    print(f"Initialized: {guard}")
    print("\nUsage:")
    print("  @guard.before_action(min_trust=0.7)")
    print("  def my_task(agent_did):")
    print("      pass")
    print("\n  result = guard.check_trust('did:meeet:agent123')")
    print("  if result.passed:")
    print("      print('Agent trusted!')")