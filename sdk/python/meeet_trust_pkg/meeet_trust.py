"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task(agent_did):
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/trust-api
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

import logging
import os
import urllib.error
import urllib.request
import json
from functools import wraps
from typing import Any, Callable, Dict, Optional

# Default configuration
DEFAULT_TRUST_API_URL = "https://meeet.world/api/trust"
DEFAULT_MIN_TRUST = 0.5
DEFAULT_SARA_THRESHOLD = 0.6

# Configure logging
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("meeet_trust")


class MeeetTrustError(Exception):
    """Base exception for MEEET trust errors."""
    pass


class TrustCheckFailedError(MeeetTrustError):
    """Raised when trust check fails and blocking is enabled."""
    def __init__(self, message: str, trust_data: Optional[Dict] = None):
        super().__init__(message)
        self.trust_data = trust_data or {}


class MeeetGuard:
    """
    MEEET Trust Guard — Verify AI agent trust before execution.
    
    This guard checks trust scores and SARA risk before allowing agent actions.
    Works with CrewAI, AutoGen, and LangGraph frameworks.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_TRUST_API_URL,
        default_min_trust: float = DEFAULT_MIN_TRUST,
        default_sara_threshold: float = DEFAULT_SARA_THRESHOLD,
        block_on_fail: bool = True,
        log_level: int = logging.INFO
    ):
        """
        Initialize MeeetGuard.
        
        Args:
            api_key: MEEET API key. Can also be set via MEEET_API_KEY env var.
            base_url: Base URL for trust API endpoint.
            default_min_trust: Default minimum trust score (0.0-1.0).
            default_sara_threshold: Default SARA risk threshold (0.0-1.0).
            block_on_fail: If True, block action when trust check fails. If False, just warn.
            log_level: Logging level (default: INFO).
        """
        self.api_key = api_key or os.environ.get("MEEET_API_KEY")
        self.base_url = base_url
        self.default_min_trust = default_min_trust
        self.default_sara_threshold = default_sara_threshold
        self.block_on_fail = block_on_fail
        
        logger.setLevel(log_level)
        
        if not self.api_key:
            logger.warning("No API key provided. Set MEEET_API_KEY env var or pass api_key.")

    def _call_trust_api(self, agent_did: str) -> Dict[str, Any]:
        """
        Call the MEEET trust API.
        
        Args:
            agent_did: The agent's DID (e.g., did:meeet:abc123)
            
        Returns:
            Dict containing trust_score, sara_risk, etc.
            
        Raises:
            MeeetTrustError: If API call fails.
        """
        url = f"{self.base_url}/{agent_did}"
        
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        logger.info(f"Calling trust API: {url}")
        
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read())
                logger.info(f"Trust API response: {data}")
                return data
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            logger.error(f"Trust API HTTP error: {e.code} - {error_body}")
            raise MeeetTrustError(f"Trust API error: {e.code} - {error_body}")
        except urllib.error.URLError as e:
            logger.error(f"Trust API connection error: {e.reason}")
            raise MeeetTrustError(f"Trust API error: {e.reason}")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON response from trust API: {e}")
            raise MeeetTrustError(f"Invalid JSON response: {e}")

    def check_trust(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        sara_threshold: Optional[float] = None,
        block_on_fail: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Check trust score and SARA risk for an agent.
        
        Args:
            agent_did: The agent's DID.
            min_trust: Minimum trust score required (0.0-1.0). Uses default if not provided.
            sara_threshold: SARA risk threshold. If risk > threshold, action is blocked.
            block_on_fail: Whether to block action on failure. Uses instance default if not provided.
            
        Returns:
            Dict with trust_check_passed, trust_score, sara_risk, etc.
            
        Raises:
            TrustCheckFailedError: If trust check fails and block_on_fail is True.
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        sara_threshold = sara_threshold if sara_threshold is not None else self.default_sara_threshold
        block = block_on_fail if block_on_fail is not None else self.block_on_fail
        
        logger.info(
            f"Checking trust for agent_did={agent_did}, min_trust={min_trust}, sara_threshold={sara_threshold}"
        )
        
        # Call the trust API
        trust_data = self._call_trust_api(agent_did)
        
        # Extract trust score and SARA risk
        trust_score = trust_data.get("trust_score", 0.0)
        sara_risk = trust_data.get("sara_risk", 0.0)
        
        logger.info(f"Trust score: {trust_score}, SARA risk: {sara_risk}")
        
        # Check trust score
        trust_passed = trust_score >= min_trust
        # Check SARA risk (lower is better, so we check if risk > threshold)
        sara_passed = sara_risk <= sara_threshold
        
        overall_passed = trust_passed and sara_passed
        
        result = {
            "agent_did": agent_did,
            "trust_score": trust_score,
            "sara_risk": sara_risk,
            "trust_passed": trust_passed,
            "sara_passed": sara_passed,
            "overall_passed": overall_passed,
            "trust_data": trust_data
        }
        
        if overall_passed:
            logger.info(f"Trust check PASSED for agent {agent_did}")
        else:
            failure_reasons = []
            if not trust_passed:
                failure_reasons.append(f"trust_score {trust_score} < {min_trust}")
            if not sara_passed:
                failure_reasons.append(f"sara_risk {sara_risk} > {sara_threshold}")
            
            logger.warning(f"Trust check FAILED for agent {agent_did}: {'; '.join(failure_reasons)}")
            
            if block:
                raise TrustCheckFailedError(
                    f"Trust check failed: {'; '.join(failure_reasons)}",
                    trust_data=result
                )
        
        return result

    def before_action(
        self,
        min_trust: Optional[float] = None,
        sara_threshold: Optional[float] = None,
        block_on_fail: Optional[bool] = None
    ) -> Callable:
        """
        Decorator to wrap agent functions with trust verification.
        
        This decorator checks trust before executing the wrapped function.
        Use with CrewAI before_task hooks, AutoGen middleware, or LangGraph nodes.
        
        Args:
            min_trust: Minimum trust score required (0.0-1.0).
            sara_threshold: SARA risk threshold.
            block_on_fail: Whether to block action on failure.
            
        Returns:
            Decorated function that performs trust check before execution.
            
        Example:
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            @guard.before_action(min_trust=0.7)
            def my_agent_task(agent_did):
                # Only runs if agent passes trust check
                return "Task executed"
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(agent_did: str, *args, **kwargs):
                # Perform trust check
                self.check_trust(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    sara_threshold=sara_threshold,
                    block_on_fail=block_on_fail
                )
                # Execute the original function
                return func(agent_did, *args, **kwargs)
            return wrapper
        return decorator

    def crewai_before_task_hook(self, agent_did: str) -> None:
        """
        CrewAI before_task hook integration.
        
        Use this as a before_task hook in your CrewAI agent:
        
            from crewai import Agent
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            researcher = Agent(
                role="Research Scientist",
                goal="Complete research tasks",
                backstory="You are a research scientist",
                before_task_hook=guard.crewai_before_task_hook
            )
        
        Args:
            agent_did: The agent's DID to check.
            
        Raises:
            TrustCheckFailedError: If trust check fails.
        """
        self.check_trust(agent_did=agent_did)

    def autogen_middleware(self, agent_did: str) -> bool:
        """
        AutoGen middleware for agent verification.
        
        Use this as middleware in your AutoGen agent:
        
            from autogen import ConversableAgent
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            agent = ConversableAgent(
                name="researcher",
                llm_config={"model": "gpt-4"},
                middleware=[guard.autogen_middleware]
            )
        
        Args:
            agent_did: The agent's DID to check.
            
        Returns:
            True if trust check passed, False otherwise.
        """
        try:
            self.check_trust(agent_did=agent_did)
            return True
        except MeeetTrustError:
            return False

    def langgraph_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        LangGraph node for trust verification.
        
        Use this as a node in your LangGraph state graph:
        
            from langgraph.graph import StateGraph
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            graph = StateGraph(AgentState)
            graph.add_node("trust_check", guard.langgraph_node)
            graph.add_edge("__start__", "trust_check")
            # ... continue graph setup
        
        Args:
            state: LangGraph state dict containing 'agent_did' key.
            
        Returns:
            Updated state dict.
            
        Raises:
            MeeetTrustError: If trust check fails.
        """
        agent_did = state.get("agent_did")
        if not agent_did:
            raise MeeetTrustError("State must contain 'agent_did' key")
        
        result = self.check_trust(agent_did=agent_did)
        
        # Add trust info to state
        state["trust_score"] = result["trust_score"]
        state["sara_risk"] = result["sara_risk"]
        state["trust_passed"] = result["trust_passed"]
        state["overall_passed"] = result["overall_passed"]
        
        return state


def check_trust(
    agent_did: str,
    api_key: Optional[str] = None,
    min_trust: float = DEFAULT_MIN_TRUST,
    sara_threshold: float = DEFAULT_SARA_THRESHOLD
) -> Dict[str, Any]:
    """
    Convenience function to check trust for an agent.
    
    Args:
        agent_did: The agent's DID.
        api_key: MEEET API key.
        min_trust: Minimum trust score required.
        sara_threshold: SARA risk threshold.
        
    Returns:
        Trust check result dict.
    """
    guard = MeeetGuard(api_key=api_key)
    return guard.check_trust(
        agent_did=agent_did,
        min_trust=min_trust,
        sara_threshold=sara_threshold
    )


# Main
if __name__ == "__main__":
    print("MEEET Trust Guard")
    print("=" * 40)
    print("""
Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task(agent_did):
        # Only runs if agent passes 7-gate check
        pass

Integrations:
    - CrewAI: guard.crewai_before_task_hook(agent_did)
    - AutoGen: guard.autogen_middleware(agent_did)
    - LangGraph: guard.langgraph_node(state)
""")
