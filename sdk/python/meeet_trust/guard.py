"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph.

This module provides trust verification for AI agents before they can perform actions.
It checks the MEEET 7-gate trust API and blocks actions if trust score is too low
or SARA risk is too high.

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key", min_trust=0.7)
    
    @guard.before_action()
    def my_agent_task(agent_did):
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/developer
Trust API: https://meeet.world/trust-api
"""

import json
import logging
import urllib.request
import urllib.error
from functools import wraps
from typing import Any, Callable, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("meeet_trust")

# Default configuration
DEFAULT_TIMEOUT = 30
DEFAULT_MIN_TRUST = 0.5
DEFAULT_MAX_SARA_RISK = 0.6
DEFAULT_BASE_URL = "https://meeet.world/api/trust"


class TrustVerificationError(Exception):
    """Raised when trust verification API call fails."""
    pass


class TrustScoreTooLow(Exception):
    """Raised when trust score is below the minimum threshold."""
    def __init__(self, trust_score: float, min_trust: float, agent_did: str):
        self.trust_score = trust_score
        self.min_trust = min_trust
        self.agent_did = agent_did
        super().__init__(
            f"Trust score {trust_score:.2f} is below minimum {min_trust:.2f} for agent {agent_did}"
        )


class SARARiskTooHigh(Exception):
    """Raised when SARA risk score exceeds the maximum threshold."""
    def __init__(self, sara_risk: float, max_risk: float, agent_did: str):
        self.sara_risk = sara_risk
        self.max_risk = max_risk
        self.agent_did = agent_did
        super().__init__(
            f"SARA risk {sara_risk:.2f} exceeds maximum {max_risk:.2f} for agent {agent_did}"
        )


class MeeetGuard:
    """
    MEEET Trust Guard for AI Agent Frameworks.
    
    Provides trust verification before agent actions using the MEEET 7-gate trust API.
    Supports CrewAI, AutoGen, and LangGraph frameworks.
    
    Args:
        api_key: MEEET API key for authentication
        min_trust: Minimum trust score (0.0-1.0) required to allow actions (default: 0.5)
        max_sara_risk: Maximum SARA risk score (0.0-1.0) allowed (default: 0.6)
        base_url: Override the default MEEET API base URL
        timeout: Request timeout in seconds (default: 30)
    """
    
    def __init__(
        self,
        api_key: str,
        min_trust: float = DEFAULT_MIN_TRUST,
        max_sara_risk: float = DEFAULT_MAX_SARA_RISK,
        base_url: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        self.api_key = api_key
        self.min_trust = min_trust
        self.max_sara_risk = max_sara_risk
        self.base_url = base_url or DEFAULT_BASE_URL
        self.timeout = timeout
        
        logger.info(f"MeeetGuard initialized: min_trust={min_trust}, max_sara_risk={max_sara_risk}")
    
    def _call_trust_api(self, agent_did: str) -> Dict[str, Any]:
        """
        Call the MEEET trust API for a given agent DID.
        
        Args:
            agent_did: The agent's DID (did:meeet:...)
            
        Returns:
            Dict containing trust_score, sara_risk, and other trust data
            
        Raises:
            TrustVerificationError: If API call fails
        """
        url = f"{self.base_url}/{agent_did}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        req = urllib.request.Request(url, headers=headers, method="GET")
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                data = json.loads(response.read().decode())
                
                logger.info(f"Trust API response for {agent_did}: trust={data.get('trust_score')}, sara_risk={data.get('sara_risk')}")
                return data
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            logger.error(f"Trust API HTTP error {e.code}: {error_body}")
            raise TrustVerificationError(f"HTTP {e.code}: {error_body}")
            
        except urllib.error.URLError as e:
            logger.error(f"Trust API connection error: {e.reason}")
            raise TrustVerificationError(f"Connection error: {e.reason}")
            
        except json.JSONDecodeError as e:
            logger.error(f"Trust API invalid JSON response: {e}")
            raise TrustVerificationError(f"Invalid JSON response: {e}")
    
    def verify(self, agent_did: str) -> Dict[str, Any]:
        """
        Verify trust for an agent.
        
        Args:
            agent_did: The agent's DID (did:meeet:...)
            
        Returns:
            Dict containing trust verification results
            
        Raises:
            TrustScoreTooLow: If trust score is below minimum
            SARARiskTooHigh: If SARA risk exceeds maximum
            TrustVerificationError: If API call fails
        """
        logger.info(f"Verifying trust for agent: {agent_did}")
        
        trust_data = self._call_trust_api(agent_did)
        
        trust_score = trust_data.get("trust_score", 0.0)
        sara_risk = trust_data.get("sara_risk", 0.0)
        
        # Check trust score threshold
        if trust_score < self.min_trust:
            logger.warning(
                f"BLOCKED: Agent {agent_did} trust score {trust_score:.2f} below minimum {self.min_trust:.2f}"
            )
            raise TrustScoreTooLow(trust_score, self.min_trust, agent_did)
        
        # Check SARA risk threshold
        if sara_risk > self.max_sara_risk:
            logger.warning(
                f"BLOCKED: Agent {agent_did} SARA risk {sara_risk:.2f} exceeds maximum {self.max_sara_risk:.2f}"
            )
            raise SARARiskTooHigh(sara_risk, self.max_sara_risk, agent_did)
        
        logger.info(f"ALLOWED: Agent {agent_did} passed trust verification (trust={trust_score:.2f}, sara_risk={sara_risk:.2f})")
        
        return {
            "allowed": True,
            "agent_did": agent_did,
            "trust_score": trust_score,
            "sara_risk": sara_risk,
            "details": trust_data,
        }
    
    def before_action(self, min_trust: Optional[float] = None, max_sara_risk: Optional[float] = None):
        """
        Decorator to verify trust before an agent action.
        
        Usage:
            guard = MeeetGuard(api_key="key", min_trust=0.7)
            
            @guard.before_action()
            def my_task(agent_did):
                # Only runs if trust verification passes
                pass
        
        Args:
            min_trust: Override default minimum trust score for this action
            max_sara_risk: Override default maximum SARA risk for this action
            
        Returns:
            Decorator function that wraps the action with trust verification
        """
        # Use instance defaults if not overridden
        effective_min_trust = min_trust if min_trust is not None else self.min_trust
        effective_max_sara_risk = max_sara_risk if max_sara_risk is not None else self.max_sara_risk
        
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(agent_did: str, *args, **kwargs) -> Any:
                # Create a temporary guard with overridden thresholds
                temp_guard = MeeetGuard(
                    api_key=self.api_key,
                    min_trust=effective_min_trust,
                    max_sara_risk=effective_max_sara_risk,
                    base_url=self.base_url,
                    timeout=self.timeout,
                )
                
                # Verify trust before executing the action
                result = temp_guard.verify(agent_did)
                
                # Execute the action if verification passed
                return func(agent_did, *args, **kwargs)
            
            return wrapper
        return decorator
    
    def crewai_before_task(self, agent_did_attr: str = "agent_did"):
        """
        CrewAI before_task hook integration.
        
        Usage:
            from crewai import Agent
            
            guard = MeeetGuard(api_key="key", min_trust=0.7)
            
            researcher = Agent(
                role="Researcher",
                goal="Research tasks",
                backstory="You are a research scientist",
                before_task=guard.crewai_before_task()
            )
        
        Args:
            agent_did_attr: The attribute name on the task context containing agent DID
            
        Returns:
            A before_task hook function for CrewAI
        """
        def before_task_hook(task):
            # Try to get agent DID from task context
            agent_did = getattr(task, agent_did_attr, None)
            if not agent_did:
                # Try to get from task's agent
                agent_did = getattr(task.agent, "agent_did", None)
            
            if not agent_did:
                logger.warning("No agent DID found in task context, allowing action")
                return
            
            self.verify(agent_did)
            logger.info(f"CrewAI before_task hook passed for agent: {agent_did}")
        
        return before_task_hook
    
    def autogen_middleware(self, agent_did_attr: str = "agent_did"):
        """
        AutoGen agent verification middleware.
        
        Usage:
            from autogen import ConversableAgent
            
            guard = MeeetGuard(api_key="key", min_trust=0.7)
            
            agent = ConversableAgent(
                name="researcher",
                llm_config={"model": "gpt-4"},
                before_message=guard.autogen_middleware()
            )
        
        Args:
            agent_did_attr: The attribute name on the agent containing DID
            
        Returns:
            A middleware function for AutoGen
        """
        def middleware(agent, message, context):
            agent_did = getattr(agent, agent_did_attr, None)
            if not agent_did:
                logger.warning("No agent DID found, allowing action")
                return True
            
            self.verify(agent_did)
            logger.info(f"AutoGen middleware passed for agent: {agent_did}")
            return True
        
        return middleware
    
    def langgraph_node(self, node_name: str = "trust_check"):
        """
        LangGraph node that calls MEEET trust API.
        
        Usage:
            from langgraph.graph import StateGraph
            
            guard = MeeetGuard(api_key="key", min_trust=0.7)
            
            def trust_check_node(state):
                agent_did = state.get("agent_did")
                result = guard.verify(agent_did)
                return {**state, "trust_verified": True, "trust_result": result}
            
            graph.add_node("trust_check", trust_check_node)
        
        Args:
            node_name: Name for this node (for logging)
            
        Returns:
            A node function for LangGraph
        """
        def node(state: Dict[str, Any]) -> Dict[str, Any]:
            agent_did = state.get("agent_did")
            if not agent_did:
                logger.warning("No agent DID in state, allowing action")
                return {**state, "trust_verified": True}
            
            result = self.verify(agent_did)
            logger.info(f"LangGraph node '{node_name}' passed for agent: {agent_did}")
            return {**state, "trust_verified": True, "trust_result": result}
        
        return node


def quick_verify(agent_did: str, api_key: str, min_trust: float = 0.5, max_sara_risk: float = 0.6) -> Dict[str, Any]:
    """
    Quick one-liner trust verification.
    
    Usage:
        result = quick_verify("did:meeet:abc123", "your_api_key")
        if result["allowed"]:
            print("Agent is trusted!")
    
    Args:
        agent_did: The agent's DID
        api_key: MEEET API key
        min_trust: Minimum trust score (default: 0.5)
        max_sara_risk: Maximum SARA risk (default: 0.6)
        
    Returns:
        Dict with trust verification results
    """
    guard = MeeetGuard(
        api_key=api_key,
        min_trust=min_trust,
        max_sara_risk=max_sara_risk,
    )
    
    try:
        return guard.verify(agent_did)
    except (TrustScoreTooLow, SARARiskTooHigh) as e:
        return {
            "allowed": False,
            "agent_did": agent_did,
            "reason": str(e),
        }
