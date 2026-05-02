"""
MEEET Guard — Trust Verification for AI Agent Frameworks

Provides decorators and utilities to verify AI agents against MEEET's
7-gate trust system before allowing them to execute actions.

Supports:
- CrewAI (before_task hook)
- AutoGen (agent verification middleware)
- LangGraph (node verification)
"""

import functools
import logging
from typing import Callable, Optional, Dict, Any, List
from .client import MeeetTrustClient, MeeetAPIError, TrustScore

logger = logging.getLogger(__name__)


class TrustCheckError(Exception):
    """Base exception for trust check failures."""
    pass


class TrustScoreTooLow(TrustCheckError):
    """Raised when agent trust score is below threshold."""
    def __init__(self, agent_did: str, score: float, threshold: float):
        self.agent_did = agent_did
        self.score = score
        self.threshold = threshold
        super().__init__(
            f"Trust score {score:.2f} for {agent_did} is below threshold {threshold}"
        )


class SARARiskTooHigh(TrustCheckError):
    """Raised when SARA risk exceeds threshold."""
    def __init__(self, agent_did: str, risk: float, threshold: float):
        self.agent_did = agent_did
        self.risk = risk
        self.threshold = threshold
        super().__init__(
            f"SARA risk {risk:.2f} for {agent_did} exceeds threshold {threshold}"
        )


class MeeetGuard:
    """
    MEEET Trust Guard for AI Agent Frameworks.
    
    Provides trust verification before agent actions.
    
    Usage:
        from meeet_trust import MeeetGuard
        
        guard = MeeetGuard(api_key="your_key")
        
        @guard.before_action(min_trust=0.7)
        def my_agent_task():
            # Only runs if agent passes 7-gate check
            pass
    """
    
    def __init__(self, api_key: str, min_trust: float = 0.5, 
                 max_sara_risk: float = 0.6, base_url: Optional[str] = None):
        """
        Initialize MEEET Guard.
        
        Args:
            api_key: MEEET API key
            min_trust: Default minimum trust score (0.0-1.0)
            max_sara_risk: Default maximum SARA risk (0.0-1.0)
            base_url: Optional custom API base URL
        """
        self.api_key = api_key
        self.min_trust = min_trust
        self.max_sara_risk = max_sara_risk
        self.client = MeeetTrustClient(api_key, base_url)
        
        # Track verified agents
        self._verified_agents: Dict[str, TrustScore] = {}
        
        logger.info(f"MeeetGuard initialized: min_trust={min_trust}, max_sara_risk={max_sara_risk}")
    
    def before_action(self, min_trust: Optional[float] = None, 
                      max_sara_risk: Optional[float] = None,
                      block_on_fail: bool = True,
                      warn_on_fail: bool = True) -> Callable:
        """
        Decorator to verify agent trust before executing an action.
        
        Args:
            min_trust: Minimum trust score (overrides default)
            max_sara_risk: Maximum SARA risk (overrides default)
            block_on_fail: Raise exception if trust check fails
            warn_on_fail: Log warning if trust check fails
        
        Returns:
            Decorated function
        
        Example:
            @guard.before_action(min_trust=0.7, max_sara_risk=0.5)
            def my_task(agent_did):
                # Only runs if agent passes trust check
                pass
        """
        min_trust = min_trust if min_trust is not None else self.min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.max_sara_risk
        
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Extract agent_did from args/kwargs
                agent_did = self._extract_agent_did(args, kwargs)
                
                if not agent_did:
                    logger.warning("No agent_did found in function arguments, skipping trust check")
                    return func(*args, **kwargs)
                
                # Perform trust check
                result = self.check_trust(agent_did, min_trust, max_sara_risk)
                
                if not result["passed"]:
                    msg = f"Trust check failed for {agent_did}: score={result['trust_score']:.2f}, risk={result['sara_risk']:.2f}"
                    
                    if warn_on_fail:
                        logger.warning(msg)
                    
                    if block_on_fail:
                        if result["trust_score"] < min_trust:
                            raise TrustScoreTooLow(agent_did, result["trust_score"], min_trust)
                        if result["sara_risk"] > max_sara_risk:
                            raise SARARiskTooHigh(agent_did, result["sara_risk"], max_sara_risk)
                    
                    return None  # Action blocked
                
                logger.info(f"Trust check passed for {agent_did}: score={result['trust_score']:.2f}")
                return func(*args, **kwargs)
            
            return wrapper
        return decorator
    
    def check_trust(self, agent_did: str, min_trust: Optional[float] = None,
                    max_sara_risk: Optional[float] = None) -> Dict[str, Any]:
        """
        Check trust for an agent.
        
        Args:
            agent_did: Agent DID
            min_trust: Minimum trust score
            max_sara_risk: Maximum SARA risk
        
        Returns:
            Dict with trust check results
        """
        min_trust = min_trust if min_trust is not None else self.min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.max_sara_risk
        
        # Check cache first
        if agent_did in self._verified_agents:
            trust_score = self._verified_agents[agent_did]
            passed = trust_score.score >= min_trust and trust_score.sara_risk <= max_sara_risk
            
            return {
                "agent_did": agent_did,
                "trust_score": trust_score.score,
                "sara_risk": trust_score.sara_risk,
                "level": trust_score.level,
                "passed": passed,
                "gates_passed": trust_score.gates_passed,
                "cached": True,
            }
        
        # Make API call
        try:
            result = self.client.check_trust(agent_did, min_trust, max_sara_risk)
            
            # Cache the result
            self._verified_agents[agent_did] = TrustScore(
                agent_did=agent_did,
                score=result["trust_score"],
                level=result["level"],
                sara_risk=result["sara_risk"],
                reputation=0,
                stake=0,
                verified=result["passed"],
                gates_passed=result["gates_passed"],
                timestamp="",
            )
            
            return result
            
        except MeeetAPIError as e:
            logger.error(f"Failed to check trust for {agent_did}: {e}")
            # On API error, fail open (allow action) but log warning
            return {
                "agent_did": agent_did,
                "trust_score": 0.0,
                "sara_risk": 1.0,
                "level": "L0",
                "passed": False,
                "gates_passed": {},
                "error": str(e),
            }
    
    def verify_agent(self, agent_did: str) -> Dict[str, Any]:
        """
        Verify an agent against the 7-gate trust system.
        
        Args:
            agent_did: Agent DID
        
        Returns:
            Verification result
        """
        return self.client.verify_agent(agent_did)
    
    def _extract_agent_did(self, args: tuple, kwargs: dict) -> Optional[str]:
        """Extract agent_did from function arguments."""
        # Check kwargs first
        for key in ["agent_did", "agent_id", "did", "agent"]:
            if key in kwargs:
                return kwargs[key]
        
        # Check positional args
        for arg in args:
            if isinstance(arg, str) and arg.startswith("did:"):
                return arg
        
        return None
    
    def crewai_hook(self, min_trust: Optional[float] = None,
                    max_sara_risk: Optional[float] = None) -> Callable:
        """
        Create a CrewAI before_task hook.
        
        Usage:
            from crewai import Agent, Task
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            agent = Agent(
                role="Researcher",
                goal="Research topics",
                tools=[...],
                before_task=guard.crewai_hook(min_trust=0.7)
            )
        """
        min_trust = min_trust if min_trust is not None else self.min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.max_sara_risk
        
        def hook(task, agent):
            agent_did = getattr(agent, "agent_did", None) or getattr(agent, "id", None)
            if not agent_did:
                logger.warning("No agent_did found for CrewAI agent")
                return
            
            result = self.check_trust(agent_did, min_trust, max_sara_risk)
            
            if not result["passed"]:
                raise TrustCheckError(
                    f"Agent {agent_did} failed trust check: "
                    f"score={result['trust_score']:.2f}, risk={result['sara_risk']:.2f}"
                )
            
            logger.info(f"CrewAI hook: Agent {agent_did} passed trust check")
        
        return hook
    
    def autogen_middleware(self, min_trust: Optional[float] = None,
                           max_sara_risk: Optional[float] = None) -> Callable:
        """
        Create an AutoGen verification middleware.
        
        Usage:
            from autogen import ConversableAgent
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            agent = ConversableAgent(
                name="researcher",
                llm_config={...},
                middleware=[guard.autogen_middleware(min_trust=0.7)]
            )
        """
        min_trust = min_trust if min_trust is not None else self.min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.max_sara_risk
        
        def middleware(agent, message, sender):
            agent_did = getattr(agent, "agent_did", None) or getattr(agent, "id", None)
            if not agent_did:
                logger.warning("No agent_did found for AutoGen agent")
                return True  # Allow
            
            result = self.check_trust(agent_did, min_trust, max_sara_risk)
            
            if not result["passed"]:
                logger.warning(f"AutoGen middleware: Blocking agent {agent_did}")
                return False  # Block
            
            logger.info(f"AutoGen middleware: Agent {agent_did} passed trust check")
            return True  # Allow
        
        return middleware
    
    def langgraph_node(self, min_trust: Optional[float] = None,
                       max_sara_risk: Optional[float] = None) -> Callable:
        """
        Create a LangGraph node that verifies trust.
        
        Usage:
            from langgraph.graph import StateGraph
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            def verify_node(state):
                agent_did = state.get("agent_did")
                result = guard.check_trust(agent_did, min_trust=0.7)
                return {"trust_verified": result["passed"], "trust_result": result}
            
            graph = StateGraph(...)
            graph.add_node("verify", verify_node)
        """
        min_trust = min_trust if min_trust is not None else self.min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.max_sara_risk
        
        def node(state: dict) -> dict:
            agent_did = state.get("agent_did")
            if not agent_did:
                logger.warning("No agent_did in LangGraph state")
                return {**state, "trust_verified": False, "trust_error": "No agent_did"}
            
            result = self.check_trust(agent_did, min_trust, max_sara_risk)
            
            return {
                **state,
                "trust_verified": result["passed"],
                "trust_score": result["trust_score"],
                "sara_risk": result["sara_risk"],
                "trust_gates": result.get("gates_passed", {}),
            }
        
        return node
    
    def clear_cache(self, agent_did: Optional[str] = None):
        """
        Clear trust check cache.
        
        Args:
            agent_did: Specific agent to clear, or None for all
        """
        if agent_did:
            self._verified_agents.pop(agent_did, None)
            logger.info(f"Cleared cache for {agent_did}")
        else:
            self._verified_agents.clear()
            logger.info("Cleared all trust cache")
