"""
MEEET Trust Guard — Core Implementation

Provides trust verification for AI agent frameworks before any action is executed.
Calls MEEET 7-gate trust API and validates trust score + SARA risk.
"""

import json
import logging
import urllib.request
from functools import wraps
from typing import Optional, Callable, Any, Dict, List, TypeVar

from .exceptions import TrustVerificationError, TrustScoreTooLow, SARARiskTooHigh

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("meeet_trust")

# API Configuration
TRUST_API_BASE = "https://meeet.world/api"
DEFAULT_TIMEOUT = 30

F = TypeVar('F', bound=Callable[..., Any])


class MeeetTrustResponse:
    """Parsed response from MEEET Trust API."""
    
    def __init__(self, data: dict):
        self.raw = data
        self.agent_did = data.get("agent_did", "")
        self.combined_trust_score = data.get("combined_trust_score", 0.0)
        self.gates = data.get("gates", {})
        
        # Gate 4: SARA Risk Assessment
        self.sara_risk = self.gates.get("risk_assessment", 0.0)
        
        # Other gates
        self.identity = self.gates.get("identity", "unknown")
        self.authority = self.gates.get("authority", "unknown")
        self.wallet_state = self.gates.get("wallet_state", "unknown")
        self.verification_accuracy = self.gates.get("verification_accuracy", 0.0)
        self.behavioral_trust = self.gates.get("behavioral_trust", 0.0)
        self.economic_accountability = self.gates.get("economic_accountability", "unknown")
    
    def __repr__(self):
        return f"MeeetTrustResponse(trust_score={self.combined_trust_score}, sara_risk={self.sara_risk})"


class MeeetGuard:
    """
    MEEET Trust Guard for AI Agent Frameworks.
    
    Provides decorator-based trust verification before agent actions.
    
    Args:
        api_key: MEEET API key for authentication
        default_min_trust: Minimum trust score threshold (default: 0.7)
        default_max_sara: Maximum SARA risk threshold (default: 0.6)
        log_level: Logging level (default: INFO)
    
    Example:
        guard = MeeetGuard(api_key="your_key")
        
        @guard.before_action(min_trust=0.7, max_sara=0.6)
        def my_agent_task():
            pass
    """
    
    def __init__(
        self,
        api_key: str,
        default_min_trust: float = 0.7,
        default_max_sara: float = 0.6,
        log_level: int = logging.INFO,
    ):
        self.api_key = api_key
        self.default_min_trust = default_min_trust
        self.default_max_sara = default_max_sara
        logger.setLevel(log_level)
        
        logger.info(f"MeeetGuard initialized with min_trust={default_min_trust}, max_sara={default_max_sara}")
    
    def _call_trust_api(self, agent_did: str) -> MeeetTrustResponse:
        """
        Call MEEET Trust API to get agent trust score.
        
        Args:
            agent_did: Agent DID (e.g., "did:meeet:agent_0x7a3f")
        
        Returns:
            MeeetTrustResponse with trust score and gate results
        
        Raises:
            TrustVerificationError: If API call fails
        """
        url = f"{TRUST_API_BASE}/trust/{agent_did}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        logger.info(f"Calling MEEET Trust API for {agent_did}")
        
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as response:
                data = json.loads(response.read())
                logger.info(f"Trust API response: score={data.get('combined_trust_score')}, sara={data.get('gates', {}).get('risk_assessment')}")
                return MeeetTrustResponse(data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            logger.error(f"Trust API HTTP error {e.code}: {error_body}")
            raise TrustVerificationError(f"HTTP {e.code}: {error_body}")
        except urllib.error.URLError as e:
            logger.error(f"Trust API connection error: {e.reason}")
            raise TrustVerificationError(f"Connection error: {e.reason}")
        except json.JSONDecodeError as e:
            logger.error(f"Trust API JSON decode error: {e}")
            raise TrustVerificationError(f"Invalid JSON response: {e}")
        except Exception as e:
            logger.error(f"Unexpected error calling Trust API: {e}")
            raise TrustVerificationError(f"Unexpected error: {e}")
    
    def verify(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
    ) -> MeeetTrustResponse:
        """
        Verify agent trust score and SARA risk.
        
        Args:
            agent_did: Agent DID to verify
            min_trust: Minimum trust score (uses default if not provided)
            max_sara: Maximum SARA risk (uses default if not provided)
        
        Returns:
            MeeetTrustResponse with verification results
        
        Raises:
            TrustScoreTooLow: If trust score is below threshold
            SARARiskTooHigh: If SARA risk is above threshold
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara = max_sara if max_sara is not None else self.default_max_sara
        
        logger.info(f"Verifying agent {agent_did} (min_trust={min_trust}, max_sara={max_sara})")
        
        response = self._call_trust_api(agent_did)
        
        # Check trust score
        if response.combined_trust_score < min_trust:
            logger.warning(f"Trust score {response.combined_trust_score} below threshold {min_trust}")
            raise TrustScoreTooLow(
                f"Trust score {response.combined_trust_score} is below minimum {min_trust}",
                score=response.combined_trust_score,
                threshold=min_trust,
            )
        
        # Check SARA risk
        if response.sara_risk > max_sara:
            logger.warning(f"SARA risk {response.sara_risk} above threshold {max_sara}")
            raise SARARiskTooHigh(
                f"SARA risk {response.sara_risk} exceeds maximum {max_sara}",
                risk=response.sara_risk,
                threshold=max_sara,
            )
        
        logger.info(f"Agent {agent_did} passed trust verification")
        return response
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
        agent_did_param: str = "agent_did",
    ) -> Callable[[F], F]:
        """
        Decorator to verify trust before agent action.
        
        Args:
            min_trust: Minimum trust score threshold
            max_sara: Maximum SARA risk threshold
            agent_did_param: Name of the function parameter containing agent_did
        
        Returns:
            Decorated function that verifies trust before execution
        
        Example:
            guard = MeeetGuard(api_key="key")
            
            @guard.before_action(min_trust=0.7)
            def my_task(agent_did: str, ...):
                # Only runs if agent passes trust check
                pass
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara = max_sara if max_sara is not None else self.default_max_sara
        
        def decorator(func: F) -> F:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Extract agent_did from args/kwargs
                import inspect
                sig = inspect.signature(func)
                param_names = list(sig.parameters.keys())
                
                agent_did = None
                
                # Check if agent_did_param is in kwargs
                if agent_did_param in kwargs:
                    agent_did = kwargs[agent_did_param]
                # Check if it's in positional args
                elif agent_did_param in param_names:
                    idx = param_names.index(agent_did_param)
                    if idx < len(args):
                        agent_did = args[idx]
                
                if not agent_did:
                    raise TrustVerificationError(
                        f"agent_did not found. Provide it as '{agent_did_param}' parameter or set agent_did_param."
                    )
                
                # Verify trust before action
                self.verify(agent_did, min_trust=min_trust, max_sara=max_sara)
                
                # Execute the original function
                return func(*args, **kwargs)
            
            return wrapper  # type: ignore
        return decorator
    
    # ─────────────────────────────────────────────────────────────
    # CrewAI Integration
    # ─────────────────────────────────────────────────────────────
    
    def crewai_before_task_hook(self, agent_did: str) -> bool:
        """
        CrewAI before_task hook implementation.
        
        Use with CrewAI agents:
        
            from crewai import Agent
            
            guard = MeeetGuard(api_key="key")
            
            @agent.before_task
            def check_trust(task):
                return guard.crewai_before_task_hook(task.agent_did)
        
        Returns:
            True if agent passes trust check, raises exception otherwise
        """
        response = self.verify(agent_did)
        logger.info(f"CrewAI hook: Agent {agent_did} passed trust check")
        return True
    
    # ─────────────────────────────────────────────────────────────
    # AutoGen Integration
    # ─────────────────────────────────────────────────────────────
    
    def autogen_middleware(self, agent_did: str, message: Any = None) -> bool:
        """
        AutoGen middleware for agent verification.
        
        Use with AutoGen agents:
        
            from autogen import ConversableAgent
            
            guard = MeeetGuard(api_key="key")
            
            agent = ConversableAgent(
                name="assistant",
                middleware=[guard.autogen_middleware]
            )
        
        Returns:
            True if agent passes trust check, raises exception otherwise
        """
        response = self.verify(agent_did)
        logger.info(f"AutoGen middleware: Agent {agent_did} passed trust check")
        return True
    
    # ─────────────────────────────────────────────────────────────
    # LangGraph Integration
    # ─────────────────────────────────────────────────────────────
    
    def langgraph_node(self, state: Dict) -> Dict:
        """
        LangGraph node that calls MEEET 7-gate trust API.
        
        Use in LangGraph state machine:
        
            from langgraph.graph import StateGraph
            
            guard = MeeetGuard(api_key="key")
            
            def trust_check_node(state):
                return guard.langgraph_node(state)
            
            graph = StateGraph(GraphState)
            graph.add_node("trust_check", trust_check_node)
            graph.add_edge("__start__", "trust_check")
        
        Args:
            state: LangGraph state dict with 'agent_did' key
        
        Returns:
            Updated state with trust verification result
        """
        agent_did = state.get("agent_did")
        if not agent_did:
            raise TrustVerificationError("agent_did not found in state")
        
        response = self.verify(agent_did)
        
        # Add trust info to state
        state["trust_score"] = response.combined_trust_score
        state["sara_risk"] = response.sara_risk
        state["trust_verified"] = True
        state["gates"] = response.gates
        
        logger.info(f"LangGraph node: Agent {agent_did} verified, score={response.combined_trust_score}")
        return state
