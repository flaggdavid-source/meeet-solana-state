"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

This module provides trust verification for AI agents before they can perform actions.
It checks the MEEET trust score and SARA risk assessment.

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task(agent_did: str, task_data: dict):
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/developer
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

import json
import logging
import urllib.request
import urllib.error
from functools import wraps
from typing import Any, Callable, Dict, List, Optional

# Default configuration
TRUST_API_BASE = "https://meeet.world/api/trust"
DEFAULT_TIMEOUT = 30

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("meeet_trust")


# ═══ Custom Exceptions ═══

class TrustVerificationError(Exception):
    """Base exception for trust verification errors."""
    pass


class TrustScoreTooLow(TrustVerificationError):
    """Raised when agent's trust score is below threshold."""
    def __init__(self, agent_did: str, trust_score: float, min_trust: float):
        self.agent_did = agent_did
        self.trust_score = trust_score
        self.min_trust = min_trust
        super().__init__(
            f"Trust score {trust_score:.2f} for agent {agent_did} is below "
            f"minimum threshold {min_trust}"
        )


class SaraRiskTooHigh(TrustVerificationError):
    """Raised when agent's SARA risk exceeds threshold."""
    def __init__(self, agent_did: str, sara_risk: float, max_risk: float):
        self.agent_did = agent_did
        self.sara_risk = sara_risk
        self.max_risk = max_risk
        super().__init__(
            f"SARA risk {sara_risk:.2f} for agent {agent_did} exceeds "
            f"maximum threshold {max_risk}"
        )


# ═══ Trust Response ═══

class TrustResponse:
    """Response from MEEET trust API."""
    
    def __init__(self, data: Dict[str, Any]):
        self.raw = data
        self.trust_score = data.get("trust_score", 0.0)
        self.sara_risk = data.get("sara_risk", 0.0)
        self.agent_did = data.get("agent_did", "")
        self.verified = data.get("verified", False)
        self.gates_passed = data.get("gates_passed", [])
        self.gates_failed = data.get("gates_failed", [])
        self.message = data.get("message", "")
    
    def __repr__(self):
        return (
            f"TrustResponse(trust_score={self.trust_score}, "
            f"sara_risk={self.sara_risk}, verified={self.verified})"
        )


# ═══ MeeetGuard Main Class ═══

class MeeetGuard:
    """
    MEEET Trust Guard for AI Agent Frameworks.
    
    Provides trust verification before agent actions using the MEEET 7-gate trust API.
    
    Supports:
    - CrewAI before_task hooks
    - AutoGen middleware
    - LangGraph nodes
    - Generic before_action decorator
    
    Example:
        from meeet_trust import MeeetGuard
        
        guard = MeeetGuard(api_key="your_key")
        
        @guard.before_action(min_trust=0.7)
        def my_agent_task(agent_did: str, task_data: dict):
            # Only runs if agent passes trust check
            pass
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
        default_min_trust: float = 0.5,
        default_max_risk: float = 0.6,
        log_level: int = logging.INFO
    ):
        """
        Initialize MeeetGuard.
        
        Args:
            api_key: MEEET API key for authentication
            base_url: Override the default trust API base URL
            timeout: Request timeout in seconds
            default_min_trust: Default minimum trust score threshold
            default_max_risk: Default maximum SARA risk threshold
            log_level: Logging level (default: INFO)
        """
        self.api_key = api_key
        self.base_url = base_url or TRUST_API_BASE
        self.timeout = timeout
        self.default_min_trust = default_min_trust
        self.default_max_risk = default_max_risk
        
        # Update logger level
        logger.setLevel(log_level)
        
        logger.info(
            f"MeeetGuard initialized with api_key={api_key[:8]}..., "
            f"base_url={self.base_url}, min_trust={default_min_trust}, "
            f"max_risk={default_max_risk}"
        )
    
    def _call_trust_api(self, agent_did: str) -> TrustResponse:
        """
        Call the MEEET trust API to get trust score and SARA risk.
        
        Args:
            agent_did: The agent's DID (did:meeet format)
            
        Returns:
            TrustResponse object with trust score and SARA risk
            
        Raises:
            TrustVerificationError: If API call fails
        """
        url = f"{self.base_url}/{agent_did}"
        
        logger.info(f"Calling trust API: {url}")
        
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                method="GET"
            )
            
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                data = json.loads(response.read().decode())
            
            return TrustResponse(data)
        
        except urllib.error.HTTPError as e:
            error_msg = f"HTTP Error {e.code}: {e.reason}"
            logger.error(error_msg)
            try:
                error_body = json.loads(e.read().decode())
                error_msg += f" - {error_body}"
            except:
                pass
            raise TrustVerificationError(error_msg)
        
        except urllib.error.URLError as e:
            error_msg = f"URL Error: {e.reason}"
            logger.error(error_msg)
            raise TrustVerificationError(error_msg)
        
        except json.JSONDecodeError as e:
            error_msg = f"JSON Decode Error: {e}"
            logger.error(error_msg)
            raise TrustVerificationError(error_msg)
        
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            raise TrustVerificationError(error_msg)
    
    def verify(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_risk: Optional[float] = None,
        block_on_fail: bool = True
    ) -> TrustResponse:
        """
        Verify an agent's trust score and SARA risk.
        
        Args:
            agent_did: The agent's DID (did:meeet format)
            min_trust: Minimum trust score threshold (uses default if None)
            max_risk: Maximum SARA risk threshold (uses default if None)
            block_on_fail: If True, raise exception when verification fails
            
        Returns:
            TrustResponse object with verification results
            
        Raises:
            TrustScoreTooLow: If trust score is below threshold
            SaraRiskTooHigh: If SARA risk exceeds threshold
            TrustVerificationError: If API call fails
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_risk = max_risk if max_risk is not None else self.default_max_risk
        
        logger.info(
            f"Verifying trust for agent_did={agent_did}, "
            f"min_trust={min_trust}, max_risk={max_risk}"
        )
        
        # Call the trust API
        response = self._call_trust_api(agent_did)
        
        logger.info(
            f"Trust check result: agent_did={response.agent_did}, "
            f"trust_score={response.trust_score}, "
            f"verified={response.verified}, gates_passed={response.gates_passed}"
        )
        
        if response.gates_failed:
            logger.warning(f"Gates failed: {response.gates_failed}")
        
        # Check trust score threshold
        if response.trust_score < min_trust:
            logger.warning(
                f"Trust score {response.trust_score:.2f} below minimum {min_trust}"
            )
            if block_on_fail:
                raise TrustScoreTooLow(agent_did, response.trust_score, min_trust)
        
        # Check SARA risk threshold
        if response.sara_risk > max_risk:
            logger.warning(
                f"SARA risk {response.sara_risk:.2f} exceeds maximum {max_risk}"
            )
            if block_on_fail:
                raise SaraRiskTooHigh(agent_did, response.sara_risk, max_risk)
        
        return response
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_risk: Optional[float] = None,
        block_on_fail: bool = True,
        agent_did_param: str = "agent_did"
    ) -> Callable:
        """
        Decorator to verify trust before executing an agent action.
        
        This decorator should be used to wrap agent tasks or functions
        that require trust verification before execution.
        
        Args:
            min_trust: Minimum trust score threshold
            max_risk: Maximum SARA risk threshold
            block_on_fail: If True, raise exception when verification fails
            agent_did_param: Name of the parameter containing agent DID
            
        Returns:
            Decorator function
            
        Example:
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            @guard.before_action(min_trust=0.7)
            def my_agent_task(agent_did: str, task_data: dict):
                # Only runs if agent passes trust check
                pass
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_risk = max_risk if max_risk is not None else self.default_max_risk
        
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Extract agent_did from args or kwargs
                agent_did = None
                
                # Try to get from kwargs first
                if agent_did_param in kwargs:
                    agent_did = kwargs[agent_did_param]
                else:
                    # Try to get from args - assume it's the first positional arg
                    if args:
                        agent_did = args[0]
                
                if not agent_did:
                    raise TrustVerificationError(
                        f"Agent DID not found. Provide '{agent_did_param}' parameter "
                        f"for before-action verification for {func.__name__}"
                    )
                
                logger.info(f"Before-action verification for {func.__name__}, agent_did={agent_did}")
                
                # Verify trust
                self.verify(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    max_risk=max_risk,
                    block_on_fail=block_on_fail
                )
                
                logger.info(f"CrewAI task verified for agent {agent_did}, proceeding with {func.__name__}")
                
                # Execute the original function
                return func(*args, **kwargs)
            
            return wrapper
        
        return decorator
    
    # CrewAI Integration
    
    def crewai_before_task(
        self,
        min_trust: Optional[float] = None,
        max_risk: Optional[float] = None
    ) -> Callable:
        """
        Create a CrewAI before_task hook.
        
        This method returns a hook function compatible with CrewAI's
        before_task callback system.
        
        Args:
            min_trust: Minimum trust score threshold
            max_risk: Maximum SARA risk threshold
            
        Returns:
            Hook function for CrewAI
            
        Example:
            from crewai import Agent, Task, Crew
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            researcher = Agent(
                role="Researcher",
                goal="Research topics",
                backstory="You are a research scientist"
            )
            
            task = Task(
                description="Research AI",
                agent=researcher,
                before_task=guard.crewai_before_task(min_trust=0.7)
            )
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_risk = max_risk if max_risk is not None else self.default_max_risk
        
        def hook(task):
            # CrewAI tasks have context with agent info
            agent = getattr(task, "agent", None)
            if agent:
                # Try to get agent DID from various sources
                agent_did = getattr(agent, "agent_did", None)
                if not agent_did:
                    # Try from agent's custom attributes
                    agent_did = getattr(agent, "did", None)
                if not agent_did:
                    # Try from agent's verbose name or id
                    agent_did = getattr(agent, "id", None) or getattr(agent, "verbose_name", None)
                
                if agent_did:
                    logger.info(f"CrewAI before_task hook for agent {agent_did}")
                    self.verify(
                        agent_did=agent_did,
                        min_trust=min_trust,
                        max_risk=max_risk,
                        block_on_fail=True
                    )
                    logger.info(f"CrewAI task verified for agent {agent_did}")
            
            return task
        
        return hook
    
    # AutoGen Integration
    
    def autogen_middleware(
        self,
        min_trust: Optional[float] = None,
        max_risk: Optional[float] = None
    ) -> Callable:
        """
        Create an AutoGen agent middleware.
        
        This method returns a middleware function compatible with AutoGen's
        agent pre-processing system.
        
        Args:
            min_trust: Minimum trust score threshold
            max_risk: Maximum SARA risk threshold
            
        Returns:
            Middleware function for AutoGen
            
        Example:
            from autogen import ConversableAgent
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            agent = ConversableAgent(
                name="researcher",
                system_message="You are a research scientist",
                middleware=guard.autogen_middleware(min_trust=0.7)
            )
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_risk = max_risk if max_risk is not None else self.default_max_risk
        
        def middleware(agent, message, sender):
            # AutoGen middleware receives agent, message, and sender
            agent_did = getattr(agent, 'agent_did', None)
            if not agent_did:
                agent_did = getattr(agent, 'id', None)
            
            if agent_did:
                logger.info(f"AutoGen middleware for agent {agent_did}")
                self.verify(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    max_risk=max_risk,
                    block_on_fail=True
                )
                logger.info(f"AutoGen message verified for agent {agent_did}")
            
            # Return None to continue processing
            return None
        
        return middleware
    
    # LangGraph Integration
    
    def langgraph_node(
        self,
        min_trust: Optional[float] = None,
        max_risk: Optional[float] = None
    ) -> Callable:
        """
        Create a LangGraph node for trust verification.
        
        This method returns a node function compatible with LangGraph's
        node system.
        
        Args:
            min_trust: Minimum trust score threshold
            max_risk: Maximum SARA risk threshold
            
        Returns:
            Node function for LangGraph
            
        Example:
            from langgraph.graph import StateGraph
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            def verify_node(state):
                # state contains 'agent_did'
                return state
            
            graph = StateGraph(State)
            graph.add_node("verify", guard.langgraph_node(min_trust=0.7))
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_risk = max_risk if max_risk is not None else self.default_max_risk
        
        def node(state: dict) -> dict:
            # LangGraph state is a dictionary
            agent_did = state.get("agent_did")
            
            if not agent_did:
                logger.warning("No agent_did in LangGraph state, skipping verification")
                return state
            
            logger.info(f"LangGraph node for agent {agent_did}")
            
            self.verify(
                agent_did=agent_did,
                min_trust=min_trust,
                max_risk=max_risk,
                block_on_fail=True
            )
            
            logger.info(f"LangGraph node verified for agent {agent_did}")
            
            # Add verification status to state
            state["trust_verified"] = True
            
            return state
        
        return node
