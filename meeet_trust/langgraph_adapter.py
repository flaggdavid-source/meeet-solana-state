"""
MEEET Trust Adapter for LangGraph

Provides a node that calls MEEET 7-gate trust API before any LangGraph node executes.

Usage:
    from meeet_trust import MeeetGuard
    from meeet_trust.adapters.langgraph import create_trust_node, MeeetTrustNode
    
    guard = MeeetGuard(api_key="your_key")
    trust_node = create_trust_node(guard, min_trust=0.7)
    
    # Use in LangGraph workflow
    from langgraph.graph import StateGraph
    
    graph = StateGraph(AgentState)
    graph.add_node("trust_check", trust_node)
    graph.add_node("agent_action", agent_action_node)
    graph.add_edge("__start__", "trust_check")
    graph.add_conditional_edges(
        "trust_check",
        lambda x: "agent_action" if x.get("trust_passed") else "blocked"
    )

Docs: https://meeet.world/trust-api
"""

import logging
from typing import Optional, Callable, Any, Dict, List, Union, TypeVar
from functools import wraps
from dataclasses import dataclass

from . import MeeetGuard, TrustResult, TrustVerificationFailed

logger = logging.getLogger("meeet_trust.langgraph")

__all__ = [
    "create_trust_node",
    "MeeetTrustNode",
    "trust_condition",
    "MeeetTrustableNode",
]

# Type variable for state
T = TypeVar('T', bound=Dict)


@dataclass
class TrustCheckResult:
    """Result of a trust check in LangGraph format."""
    agent_did: str
    trust_score: float
    sara_risk: float
    passed: bool
    message: str


def create_trust_node(
    guard: MeeetGuard,
    min_trust: float = 0.5,
    max_sara: float = 0.6,
    agent_did_key: str = "agent_did",
    output_key: str = "trust_result",
) -> Callable:
    """
    Create a LangGraph node that performs MEEET trust verification.
    
    Args:
        guard: MeeetGuard instance for trust verification
        min_trust: Minimum trust score required (0.0-1.0)
        max_sara: Maximum SARA risk allowed (0.0-1.0)
        agent_did_key: Key in state containing agent DID
        output_key: Key to store trust result in state
        
    Returns:
        A node function for LangGraph
        
    Example:
        from meeet_trust import MeeetGuard
        from meeet_trust.adapters.langgraph import create_trust_node
        
        guard = MeeetGuard(api_key="your_key")
        trust_node = create_trust_node(guard, min_trust=0.7)
        
        graph.add_node("trust_check", trust_node)
    """
    
    def trust_node(state: Dict) -> Dict:
        """
        LangGraph node that verifies agent trust.
        
        Args:
            state: The graph state (dict-like)
            
        Returns:
            Updated state with trust result
        """
        # Extract agent DID from state
        agent_did = state.get(agent_did_key)
        
        if not agent_did:
            logger.warning(f"No agent_did found in state keys: {list(state.keys())}")
            return {
                output_key: TrustCheckResult(
                    agent_did="",
                    trust_score=0.0,
                    sara_risk=1.0,
                    passed=False,
                    message="No agent_did in state",
                ),
                "trust_passed": False,
            }
        
        logger.info(f"LangGraph: Verifying trust for {agent_did}")
        
        # Perform trust verification
        result = guard.verify_trust(
            agent_did=agent_did,
            min_trust=min_trust,
            max_sara=max_sara,
        )
        
        # Format result for LangGraph
        trust_result = TrustCheckResult(
            agent_did=result.agent_did,
            trust_score=result.trust_score,
            sara_risk=result.sara_risk,
            passed=result.passed,
            message=result.message,
        )
        
        logger.info(
            f"LangGraph: Trust check {'passed' if result.passed else 'failed'} "
            f"for {agent_did}: {result.message}"
        )
        
        # Return updated state
        return {
            output_key: trust_result,
            "trust_passed": result.passed,
            "trust_score": result.trust_score,
            "sara_risk": result.sara_risk,
        }
    
    return trust_node


class MeeetTrustNode:
    """
    A LangGraph node class for MEEET trust verification.
    
    This provides a more configurable approach to trust verification
    in LangGraph workflows.
    
    Example:
        from meeet_trust import MeeetGuard
        from meeet_trust.adapters.langgraph import MeeetTrustNode
        
        guard = MeeetGuard(api_key="your_key")
        trust_node = MeeetTrustNode(
            guard=guard,
            min_trust=0.7,
            max_sara=0.6,
            agent_did_key="agent_did",
        )
        
        graph.add_node("trust", trust_node.execute)
    """
    
    def __init__(
        self,
        guard: MeeetGuard,
        min_trust: float = 0.5,
        max_sara: float = 0.6,
        agent_did_key: str = "agent_did",
        output_key: str = "trust_result",
        raise_on_fail: bool = False,
    ):
        """
        Initialize the MEEET Trust node.
        
        Args:
            guard: MeeetGuard instance
            min_trust: Minimum trust score required
            max_sara: Maximum SARA risk allowed
            agent_did_key: Key in state containing agent DID
            output_key: Key to store trust result
            raise_on_fail: Whether to raise exception on trust failure
        """
        self.guard = guard
        self.min_trust = min_trust
        self.max_sara = max_sara
        self.agent_did_key = agent_did_key
        self.output_key = output_key
        self.raise_on_fail = raise_on_fail
        
    def execute(self, state: Dict) -> Dict:
        """
        Execute trust verification on the state.
        
        Args:
            state: The graph state
            
        Returns:
            Updated state with trust result
            
        Raises:
            TrustVerificationFailed: If raise_on_fail is True and trust fails
        """
        agent_did = state.get(self.agent_did_key)
        
        if not agent_did:
            logger.warning(f"No agent_did in state")
            result = TrustCheckResult(
                agent_did="",
                trust_score=0.0,
                sara_risk=1.0,
                passed=False,
                message="No agent_did in state",
            )
        else:
            trust_result = self.guard.verify_trust(
                agent_did=agent_did,
                min_trust=self.min_trust,
                max_sara=self.max_sara,
            )
            
            result = TrustCheckResult(
                agent_did=trust_result.agent_did,
                trust_score=trust_result.trust_score,
                sara_risk=trust_result.sara_risk,
                passed=trust_result.passed,
                message=trust_result.message,
            )
            
            if self.raise_on_fail and not trust_result.passed:
                raise TrustVerificationFailed(
                    f"Trust verification failed: {trust_result.message}"
                )
        
        return {
            self.output_key: result,
            "trust_passed": result.passed,
            "trust_score": result.trust_score,
            "sara_risk": result.sara_risk,
        }
    
    def __call__(self, state: Dict) -> Dict:
        """Allow node to be called as a function."""
        return self.execute(state)


def trust_condition(
    state: Dict,
    trust_key: str = "trust_passed",
    passed_node: str = "proceed",
    failed_node: str = "blocked",
) -> str:
    """
    A conditional edge function for LangGraph that routes based on trust result.
    
    Args:
        state: The graph state
        trust_key: Key containing trust_passed boolean
        passed_node: Node to route to if trust passed
        failed_node: Node to route to if trust failed
        
    Returns:
        The name of the next node to execute
        
    Example:
        from meeet_trust.adapters.langgraph import trust_condition
        
        graph.add_conditional_edges(
            "trust_check",
            trust_condition,
            {
                "proceed": "agent_action",
                "blocked": "handle_blocked",
            }
        )
    """
    trust_passed = state.get(trust_key, False)
    
    if trust_passed:
        logger.info("Trust condition: proceeding to next node")
        return passed_node
    else:
        logger.warning("Trust condition: blocking agent action")
        return failed_node


class MeeetTrustableNode:
    """
    A wrapper for LangGraph nodes that adds automatic trust verification.
    
    This wraps any node function to first verify trust before execution.
    
    Example:
        from meeet_trust import MeeetGuard
        from meeet_trust.adapters.langgraph import MeeetTrustableNode
        
        guard = MeeetGuard(api_key="your_key")
        
        @MeeetTrustableNode(guard, min_trust=0.7)
        def agent_action(state):
            # This only runs if trust verification passes
            return {"result": "action completed"}
    """
    
    def __init__(
        self,
        guard: MeeetGuard,
        min_trust: float = 0.5,
        max_sara: float = 0.6,
        agent_did_key: str = "agent_did",
    ):
        """
        Initialize the trustable node wrapper.
        
        Args:
            guard: MeeetGuard instance
            min_trust: Minimum trust score required
            max_sara: Maximum SARA risk allowed
            agent_did_key: Key in state containing agent DID
        """
        self.guard = guard
        self.min_trust = min_trust
        self.max_sara = max_sara
        self.agent_did_key = agent_did_key
        
    def __call__(self, func: Callable) -> Callable:
        """
        Decorate a node function with trust verification.
        
        Args:
            func: The LangGraph node function to wrap
            
        Returns:
            Wrapped function that verifies trust before execution
        """
        @wraps(func)
        def wrapper(state: Dict) -> Dict:
            # First verify trust
            agent_did = state.get(self.agent_did_key)
            
            if agent_did:
                result = self.guard.verify_trust(
                    agent_did=agent_did,
                    min_trust=self.min_trust,
                    max_sara=self.max_sara,
                )
                
                if not result.passed:
                    logger.warning(
                        f"TrustableNode: Blocking execution - {result.message}"
                    )
                    return {
                        "error": result.message,
                        "trust_passed": False,
                    }
            
            # Trust passed, execute the original node
            return func(state)
        
        return wrapper


# Convenience function for creating a full trust-check workflow
def create_trust_workflow(
    guard: MeeetGuard,
    agent_node: Callable,
    blocked_node: Optional[Callable] = None,
    min_trust: float = 0.5,
    max_sara: float = 0.6,
    agent_did_key: str = "agent_did",
) -> Dict[str, Callable]:
    """
    Create a complete trust-check workflow with nodes.
    
    Args:
        guard: MeeetGuard instance
        agent_node: The main agent node to protect
        blocked_node: Optional node to execute when trust fails
        min_trust: Minimum trust score required
        max_sara: Maximum SARA risk allowed
        agent_did_key: Key in state containing agent DID
        
    Returns:
        Dict of node functions
        
    Example:
        from meeet_trust import MeeetGuard
        from meeet_trust.adapters.langgraph import create_trust_workflow
        
        guard = MeeetGuard(api_key="your_key")
        
        workflow = create_trust_workflow(
            guard=guard,
            agent_node=my_agent_action,
            blocked_node=handle_blocked,
            min_trust=0.7,
        )
        
        graph.add_nodes(
            "trust_check", workflow["trust_check"],
            "agent_action", workflow["agent_action"],
            "blocked", workflow["blocked"],
        )
    """
    trust_node = create_trust_node(
        guard=guard,
        min_trust=min_trust,
        max_sara=max_sara,
        agent_did_key=agent_did_key,
    )
    
    def blocked_handler(state: Dict) -> Dict:
        """Default blocked handler."""
        trust_result = state.get("trust_result")
        if trust_result:
            return {"blocked": True, "message": trust_result.message}
        return {"blocked": True, "message": "Trust verification failed"}
    
    return {
        "trust_check": trust_node,
        "agent_action": agent_node,
        "blocked": blocked_node or blocked_handler,
    }
