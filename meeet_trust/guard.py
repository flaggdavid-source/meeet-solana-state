"""
MEEET Trust Guard - AI Agent Trust Verification for CrewAI/AutoGen/LangGraph

This package provides trust verification for AI agents using the MEEET 7-gate trust API.
Before any agent action, it checks the trust score and SARA risk assessment.

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task(agent_did: str, query: str):
        # Only runs if agent passes 7-gate check
        pass
"""

import json
import logging
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from typing import Optional, Dict, Callable, Any
from functools import wraps

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
    trust_score: float = 0.0
    sara_risk: float = 0.0
    passed: bool = True
    blocked_reason: Optional[str] = None
    raw_response: Optional[Dict] = field(default_factory=dict)
    
    def __repr__(self):
        status = "PASSED" if self.passed else "BLOCKED"
        return f"TrustResult(agent_did={self.agent_did[:16]}..., trust={self.trust_score:.2f}, sara={self.sara_risk:.2f}, {status})"


class TrustCheckError(Exception):
    """Exception raised when a trust check fails."""
    pass


class MeeetGuard:
    """
    MEEET Trust Guard - Verify agent trust before executing actions.
    
    This guard wraps the MEEET 7-gate trust API to verify that an agent
    meets the minimum trust requirements before allowing actions.
    
    Attributes:
        api_key: MEEET API key for authentication
        base_url: Base URL for the MEEET API (default: https://meeet.world/api)
        min_trust: Minimum trust score required (0.0-1.0)
        max_sara_risk: Maximum SARA risk threshold (0.0-1.0)
        log_requests: Whether to log all trust check requests
    
    Example:
        guard = MeeetGuard(api_key="your_key")
        
        @guard.before_action(min_trust=0.7, max_sara_risk=0.6)
        def my_task(agent_did: str):
            print("Task executed!")
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://meeet.world/api",
        min_trust: float = 0.5,
        max_sara_risk: float = 0.6,
        log_requests: bool = True,
    ):
        """
        Initialize the MeeetGuard.
        
        Args:
            api_key: MEEET API key for authentication
            base_url: Base URL for the MEEET API
            min_trust: Default minimum trust score (0.0-1.0)
            max_sara_risk: Default maximum SARA risk (0.0-1.0)
            log_requests: Whether to log trust check requests
        """
        self.api_key = api_key
        self.base_url = base_url
        self.default_min_trust = min_trust
        self.default_max_sara_risk = max_sara_risk
        self.log_requests = log_requests
        
        if self.log_requests:
            logger.info(f"MeeetGuard initialized with base_url={base_url}, min_trust={min_trust}, max_sara_risk={max_sara_risk}")
    
    def check_trust(self, agent_did: str) -> TrustResult:
        """
        Check the trust score for an agent.
        
        Calls the MEEET trust API to verify the agent's trust score and
        SARA risk assessment.
        
        Args:
            agent_did: The agent's DID (e.g., "did:meeet:agent123")
        
        Returns:
            TrustResult with trust score, SARA risk, and pass/fail status
        
        Raises:
            TrustCheckError: If the API call fails
        """
        url = f"{self.base_url}/trust/{agent_did}"
        
        if self.log_requests:
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
            
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
            
            # Parse response - adjust based on actual API format
            trust_score = data.get("trust_score", data.get("score", 0.5))
            sara_risk = data.get("sara_risk", data.get("risk", 0.0))
            
            result = TrustResult(
                agent_did=agent_did,
                trust_score=float(trust_score),
                sara_risk=float(sara_risk),
                raw_response=data
            )
            
            if self.log_requests:
                logger.info(f"Trust check result: trust={result.trust_score:.2f}, sara={result.sara_risk:.2f}")
            
            return result
            
        except urllib.error.HTTPError as e:
            error_msg = f"HTTP Error {e.code}: {e.reason}"
            logger.error(error_msg)
            raise TrustCheckError(error_msg)
        except urllib.error.URLError as e:
            error_msg = f"URL Error: {e.reason}"
            logger.error(error_msg)
            raise TrustCheckError(error_msg)
        except json.JSONDecodeError as e:
            error_msg = f"JSON Decode Error: {e}"
            logger.error(error_msg)
            raise TrustCheckError(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error: {e}"
            logger.error(error_msg)
            raise TrustCheckError(error_msg)
    
    def verify(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_sara_risk: Optional[float] = None,
    ) -> TrustResult:
        """
        Verify trust for an agent with threshold checks.
        
        Args:
            agent_did: The agent's DID
            min_trust: Minimum trust score (uses default if not provided)
            max_sara_risk: Maximum SARA risk (uses default if not provided)
        
        Returns:
            TrustResult with pass/fail status
        
        Raises:
            TrustCheckError: If the agent fails trust check
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.default_max_sara_risk
        
        result = self.check_trust(agent_did)
        
        # Check trust score
        if result.trust_score < min_trust:
            result.passed = False
            result.blocked_reason = f"Trust score {result.trust_score:.2f} below minimum {min_trust}"
            if self.log_requests:
                logger.warning(f"BLOCKED: {result.blocked_reason}")
            raise TrustCheckError(result.blocked_reason)
        
        # Check SARA risk
        if result.sara_risk > max_sara_risk:
            result.passed = False
            result.blocked_reason = f"SARA risk {result.sara_risk:.2f} above maximum {max_sara_risk}"
            if self.log_requests:
                logger.warning(f"BLOCKED: {result.blocked_reason}")
            raise TrustCheckError(result.blocked_reason)
        
        if self.log_requests:
            logger.info(f"VERIFIED: Agent {agent_did[:16]}... passed trust check (trust={result.trust_score:.2f}, sara={result.sara_risk:.2f})")
        
        return result
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara_risk: Optional[float] = None,
        agent_did_param: str = "agent_did",
    ):
        """
        Decorator to verify trust before executing an agent action.
        
        This decorator should be used on CrewAI task functions. It checks
        the agent's trust score and SARA risk before allowing the action
        to proceed.
        
        Args:
            min_trust: Minimum trust score required (0.0-1.0)
            max_sara_risk: Maximum SARA risk threshold (0.0-1.0)
            agent_did_param: Name of the parameter containing the agent DID
        
        Returns:
            Decorated function that only executes if trust check passes
        
        Example:
            guard = MeeetGuard(api_key="your_key")
            
            @guard.before_action(min_trust=0.7, max_sara_risk=0.6)
            def research_task(agent_did: str, query: str):
                # Only runs if agent passes trust check
                return f"Researching: {query}"
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.default_max_sara_risk
        
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Extract agent_did from args or kwargs
                agent_did = None
                
                # Check kwargs first
                if agent_did_param in kwargs:
                    agent_did = kwargs[agent_did_param]
                else:
                    # Try to find in args (assuming it's the first argument after self)
                    # For methods, self is arg[0], so agent_did would be arg[1]
                    # For functions, agent_did would be the first arg
                    if len(args) > 0:
                        # Check if it's a method (first arg is self)
                        if hasattr(args[0], '__class__') and not isinstance(args[0], str):
                            # It's likely a method, check second arg
                            if len(args) > 1:
                                agent_did = args[1]
                        else:
                            agent_did = args[0]
                
                if not agent_did:
                    raise TrustCheckError(f"Could not find {agent_did_param} in arguments")
                
                # Perform trust check
                result = self.verify(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    max_sara_risk=max_sara_risk,
                )
                
                if self.log_requests:
                    logger.info(f"Executing {func.__name__} for agent {agent_did[:16]}... (trust={result.trust_score:.2f})")
                
                # Execute the function
                return func(*args, **kwargs)
            
            return wrapper
        return decorator
    
    def crewai_hook(self, min_trust: Optional[float] = None, max_sara_risk: Optional[float] = None):
        """
        Create a CrewAI before_task hook.
        
        This method returns a hook function that can be used with CrewAI's
        before_task callback to verify trust before each task.
        
        Args:
            min_trust: Minimum trust score required
            max_sara_risk: Maximum SARA risk threshold
        
        Returns:
            Hook function for CrewAI
        
        Example:
            from crewai import Agent, Task
            
            guard = MeeetGuard(api_key="your_key")
            
            researcher = Agent(
                role="Researcher",
                goal="Research topics",
                backstory="You are a researcher",
                before_task=guard.crewai_hook(min_trust=0.7)
            )
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.default_max_sara_risk
        
        def hook(task):
            # Get agent DID from task
            agent_did = getattr(task.agent, 'agent_did', None)
            
            if not agent_did:
                logger.warning("No agent_did found in task, allowing action")
                return
            
            try:
                self.verify(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    max_sara_risk=max_sara_risk,
                )
            except TrustCheckError as e:
                logger.error(f"Trust check blocked task: {e}")
                return False
            
            return True
        
        return hook
    
    def autogen_middleware(self, min_trust: Optional[float] = None, max_sara_risk: Optional[float] = None):
        """
        Create an AutoGen middleware for agent verification.
        
        This method returns a middleware function that can be used with
        AutoGen to verify trust before agent actions.
        
        Args:
            min_trust: Minimum trust score required
            max_sara_risk: Maximum SARA risk threshold
        
        Returns:
            Middleware function for AutoGen
        
        Example:
            from autogen import ConversableAgent
            
            guard = MeeetGuard(api_key="your_key")
            
            agent = ConversableAgent(
                "assistant",
                llm_config={"model": "gpt-4"},
                middleware=guard.autogen_middleware(min_trust=0.7)
            )
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.default_max_sara_risk
        
        def middleware(agent, message, sender, context):
            agent_did = getattr(agent, 'agent_did', None)
            
            if not agent_did:
                logger.warning("No agent_did found, allowing action")
                return True
            
            try:
                self.verify(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    max_sara_risk=max_sara_risk,
                )
            except TrustCheckError as e:
                logger.error(f"Trust check blocked agent action: {e}")
                return False
            
            return True
        
        return middleware
    
    def langgraph_node(self, min_trust: Optional[float] = None, max_sara_risk: Optional[float] = None):
        """
        Create a LangGraph node for trust verification.
        
        This method returns a node function that can be used in a LangGraph
        workflow to verify trust before proceeding.
        
        Args:
            min_trust: Minimum trust score required
            max_sara_risk: Maximum SARA risk threshold
        
        Returns:
            Node function for LangGraph
        
        Example:
            from langgraph.graph import StateGraph
            
            guard = MeeetGuard(api_key="your_key")
            
            graph = StateGraph(AgentState)
            graph.add_node("trust_check", guard.langgraph_node(min_trust=0.7))
            graph.add_edge("__start__", "trust_check")
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.default_max_sara_risk
        
        def node(state: Dict) -> Dict:
            agent_did = state.get("agent_did")
            
            if not agent_did:
                raise TrustCheckError("No agent_did in state")
            
            result = self.verify(
                agent_did=agent_did,
                min_trust=min_trust,
                max_sara_risk=max_sara_risk,
            )
            
            return {
                "trust_verified": True,
                "trust_score": result.trust_score,
                "sara_risk": result.sara_risk,
            }
        
        return node


# Quick start
if __name__ == "__main__":
    print("MEEET Trust Guard")
    print("=" * 40)
    
    # Example usage
    guard = MeeetGuard(api_key="your_api_key")
    print(f"Initialized: {guard}")
    
    print("\nUsage:")
    print("  @guard.before_action(min_trust=0.7)")
    print("  def my_task(agent_did: str, query: str):")
    print("      pass")
