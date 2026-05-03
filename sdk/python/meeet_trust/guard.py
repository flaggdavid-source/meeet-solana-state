"""
MEEET Guard — Trust verification decorator for AI agent frameworks

Provides before_action decorator that verifies agent trust before executing
any agent action. Works with CrewAI, AutoGen, and LangGraph.

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7, max_sara_risk=0.6)
    def my_agent_task(agent_did: str):
        # Only runs if agent passes 7-gate check
        pass
"""

import functools
import logging
from typing import Callable, Optional, Any, Union

from meeet_trust.client import MeeetTrustClient, TrustScore
from meeet_trust.exceptions import (
    TrustScoreTooLow,
    SARARiskTooHigh,
    AgentNotVerified,
    TrustVerificationError,
)

logger = logging.getLogger(__name__)


class MeeetGuard:
    """
    Trust verification guard for AI agent frameworks.
    
    Provides decorator-based verification for CrewAI, AutoGen, and LangGraph.
    
    Example:
        guard = MeeetGuard(api_key="your_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did: str):
            # Only runs if agent passes trust check
            pass
    """
    
    def __init__(
        self,
        api_key: str,
        min_trust: float = 0.5,
        max_sara_risk: float = 0.6,
        block_on_failure: bool = True,
        log_level: int = logging.INFO,
    ):
        """
        Initialize MeeetGuard.
        
        Args:
            api_key: Your MEEET API key
            min_trust: Default minimum trust score (0.0-1.0)
            max_sara_risk: Default maximum SARA risk (0.0-1.0)
            block_on_failure: If True, raise exception on verification failure
            log_level: Logging level
        """
        self.client = MeeetTrustClient(api_key)
        self.default_min_trust = min_trust
        self.default_max_sara_risk = max_sara_risk
        self.block_on_failure = block_on_failure
        
        # Configure logging
        logging.basicConfig(
            level=log_level,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
    
    def _get_agent_did(self, *args, **kwargs) -> Optional[str]:
        """Extract agent DID from function arguments."""
        # Look for common parameter names
        for arg in args:
            if isinstance(arg, str) and arg.startswith("did:meeet:"):
                return arg
            if isinstance(arg, str) and len(arg) > 20 and ":" in arg:
                return arg
        
        # Check kwargs
        for key in ["agent_did", "agent_id", "did", "agentDid"]:
            if key in kwargs:
                return kwargs[key]
        
        return None
    
    def _verify_and_execute(
        self,
        func: Callable,
        min_trust: float,
        max_sara_risk: float,
        block_on_failure: Optional[bool],
        *args,
        **kwargs
    ) -> Any:
        """Verify trust and execute function if verified."""
        agent_did = self._get_agent_did(*args, **kwargs)
        
        if not agent_did:
            logger.warning(
                f"Could not extract agent DID from {func.__name__} arguments. "
                f"Skipping trust verification."
            )
            return func(*args, **kwargs)
        
        logger.info(f"Verifying trust for agent: {agent_did}")
        
        try:
            is_verified, trust_score = self.client.verify_agent(
                agent_did,
                min_trust=min_trust,
                max_sara_risk=max_sara_risk
            )
            
            if not is_verified:
                should_block = self.block_on_failure if block_on_failure is None else block_on_failure
                
                if should_block:
                    if trust_score.trust_score < min_trust:
                        raise TrustScoreTooLow(
                            agent_did, trust_score.trust_score, min_trust
                        )
                    if trust_score.sara_risk > max_sara_risk:
                        raise SARARiskTooHigh(
                            agent_did, trust_score.sara_risk, max_sara_risk
                        )
                    if not trust_score.verified:
                        raise AgentNotVerified(agent_did)
                else:
                    logger.warning(
                        f"Agent {agent_did} failed verification but continuing: "
                        f"trust={trust_score.trust_score:.2f}, sara={trust_score.sara_risk:.2f}"
                    )
                    return None
            
            logger.info(
                f"Agent {agent_did} verified: "
                f"trust={trust_score.trust_score:.2f}, "
                f"gates={trust_score.gates_passed}/{trust_score.gates_total}"
            )
            
            return func(*args, **kwargs)
            
        except TrustVerificationError:
            raise
        except Exception as e:
            logger.error(f"Trust verification error: {e}")
            if self.block_on_failure:
                raise
            return func(*args, **kwargs)
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara_risk: Optional[float] = None,
        block_on_failure: Optional[bool] = None,
    ) -> Callable:
        """
        Decorator to verify agent trust before executing an action.
        
        Args:
            min_trust: Minimum trust score (0.0-1.0). Uses default if not specified.
            max_sara_risk: Maximum SARA risk (0.0-1.0). Uses default if not specified.
            block_on_failure: If True, raise exception on failure. Uses instance default if None.
            
        Returns:
            Decorated function that only executes if agent passes verification.
            
        Example:
            guard = MeeetGuard(api_key="key", min_trust=0.7)
            
            @guard.before_action()
            def research_task(agent_did: str, query: str):
                # Only runs if agent has trust >= 0.7
                pass
            
            @guard.before_action(min_trust=0.8, max_sara_risk=0.4)
            def sensitive_task(agent_did: str, data: str):
                # Stricter requirements for sensitive tasks
                pass
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.default_max_sara_risk
        
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                return self._verify_and_execute(
                    func,
                    min_trust,
                    max_sara_risk,
                    block_on_failure,
                    *args,
                    **kwargs
                )
            return wrapper
        return decorator
    
    def verify(self, agent_did: str) -> TrustScore:
        """
        Manually verify an agent's trust score.
        
        Args:
            agent_did: Agent's DID
            
        Returns:
            TrustScore object
        """
        return self.client.get_trust_score(agent_did)
    
    def check(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_sara_risk: Optional[float] = None,
    ) -> bool:
        """
        Check if an agent passes verification without executing anything.
        
        Args:
            agent_did: Agent's DID
            min_trust: Minimum trust score
            max_sara_risk: Maximum SARA risk
            
        Returns:
            True if agent passes verification
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.default_max_sara_risk
        
        is_verified, _ = self.client.verify_agent(
            agent_did,
            min_trust=min_trust,
            max_sara_risk=max_sara_risk
        )
        return is_verified


# ═══ CrewAI Integration ═══
def crewai_before_task(guard: MeeetGuard):
    """
    Create a CrewAI before_task hook.
    
    Usage:
        from crewai import Agent, Task
        from meeet_trust import MeeetGuard, crewai_before_task
        
        guard = MeeetGuard(api_key="your_key")
        
        researcher = Agent(
            role="Researcher",
            goal="Research topics",
            backstory="You are a research agent"
        )
        
        task = Task(
            description="Research AI",
            agent=researcher,
            before_task=crewai_before_task(guard)
        )
    """
    def before_task_hook(task):
        agent_did = getattr(task.agent, 'agent_did', None) or getattr(task.agent, 'id', None)
        if agent_did:
            guard.verify(agent_did)
    return before_task_hook


# ═══ LangGraph Node ═══
def trust_node(guard: MeeetGuard, node_name: str = "trust_check"):
    """
    Create a LangGraph node that verifies trust.
    
    Usage:
        from langgraph.graph import StateGraph
        from meeet_trust import MeeetGuard, trust_node
        
        guard = MeeetGuard(api_key="your_key")
        
        graph = StateGraph(AgentState)
        graph.add_node("research", research_node)
        graph.add_node("trust", trust_node(guard))
    """
    def trust_check_node(state: dict) -> dict:
        agent_did = state.get("agent_did")
        if not agent_did:
            return {**state, "trust_verified": False, "trust_error": "No agent_did in state"}
        
        try:
            trust_score = guard.verify(agent_did)
            return {
                **state,
                "trust_verified": True,
                "trust_score": trust_score.trust_score,
                "sara_risk": trust_score.sara_risk,
                "gates_passed": trust_score.gates_passed,
            }
        except Exception as e:
            return {**state, "trust_verified": False, "trust_error": str(e)}
    
    return trust_check_node
