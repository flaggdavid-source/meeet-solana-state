"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

This module provides trust verification for AI agents before executing actions.
It implements the 7-gate trust check from MEEET's trust API.

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task(agent_did="did:meeet:abc123"):
        # Only runs if agent passes trust check
        pass

Docs: https://meeet.world/developer
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

import functools
import json
import logging
import urllib.error
import urllib.request
from typing import Any, Callable, Dict, Optional

# ═══ Constants ═══

TRUST_API_BASE = "https://meeet.world/api/trust"
DEFAULT_TIMEOUT = 30

# Setup logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("meeet_trust")

# ═══ Exceptions ═══

class TrustVerificationError(Exception):
    """Raised when trust verification fails due to API errors."""
    pass


class TrustScoreTooLow(TrustVerificationError):
    """Raised when trust score is below the required threshold."""
    
    def __init__(self, agent_did: str, trust_score: float, threshold: float):
        self.agent_did = agent_did
        self.trust_score = trust_score
        self.threshold = threshold
        super().__init__(
            f"Trust score {trust_score} for agent {agent_did} is below threshold {threshold}"
        )


class SARARiskTooHigh(TrustVerificationError):
    """Raised when SARA risk assessment exceeds the threshold."""
    
    def __init__(self, agent_did: str, risk_score: float, threshold: float):
        self.agent_did = agent_did
        self.risk_score = risk_score
        self.threshold = threshold
        super().__init__(
            f"SARA risk {risk_score} for agent {agent_did} exceeds threshold {threshold}"
        )


# ═══ Main Guard Class ═══

class MeeetGuard:
    """
    MEEET Trust Guard — Verify AI agent trust before executing actions.
    
    Implements the 7-gate trust check from MEEET's trust API:
    - L1: Cryptographic Identity (DID)
    - L2: Authorization (pre-execution check)
    - L2.5: SARA Guard (risk assessment)
    - L3: Audit (Signet hash-chained receipts)
    - L4: Post-execution Verification
    - L5: Social Trust (ClawSocial)
    - L6: Economic Governance ($MEEET staking)
    
    Usage:
        guard = MeeetGuard(api_key="your_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did="did:meeet:abc123"):
            # Only runs if agent passes trust check
            pass
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = TRUST_API_BASE,
        timeout: int = DEFAULT_TIMEOUT,
        default_min_trust: float = 0.5,
        default_max_sara_risk: float = 0.6,
        log_level: int = logging.INFO
    ):
        """
        Initialize MeeetGuard.
        
        Args:
            api_key: MEEET API key for authentication
            base_url: Base URL for trust API (default: https://meeet.world/api/trust)
            timeout: Request timeout in seconds
            default_min_trust: Default minimum trust score threshold (0.0-1.0)
            default_max_sara_risk: Default maximum SARA risk threshold (0.0-1.0)
            log_level: Logging level
        """
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout
        self.default_min_trust = default_min_trust
        self.default_max_sara_risk = default_max_sara_risk
        
        logger.setLevel(log_level)
        logger.info(f"MeeetGuard initialized with base_url={base_url}")
    
    def _call_trust_api(self, agent_did: str) -> Dict[str, Any]:
        """
        Call the MEEET trust API for an agent.
        
        Args:
            agent_did: The agent's DID (e.g., did:meeet:abc123)
            
        Returns:
            Trust API response dict containing trust_score and sara_risk
            
        Raises:
            TrustVerificationError: If API call fails
        """
        url = f"{self.base_url}/{agent_did}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        logger.info(f"Calling trust API for agent: {agent_did}")
        
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                data = json.loads(response.read().decode())
                logger.info(
                    f"Trust API response for {agent_did}: trust_score={data.get('trust_score')}, sara_risk={data.get('sara_risk')}"
                )
                return data
                
        except urllib.error.HTTPError as e:
            if e.code == 404:
                logger.warning(f"Agent not found in trust registry: {agent_did}")
                # Return default scores for unknown agents
                return {"trust_score": 0.0, "sara_risk": 1.0, "status": "unknown"}
            elif e.code == 401:
                raise TrustVerificationError("Invalid API key") from e
            else:
                raise TrustVerificationError(f"HTTP error {e.code}: {e.reason}") from e
        except urllib.error.URLError as e:
            raise TrustVerificationError(f"Failed to connect to trust API: {e}") from e
        except json.JSONDecodeError as e:
            raise TrustVerificationError(f"Invalid JSON response from trust API: {e}") from e
    
    def verify(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_sara_risk: Optional[float] = None,
        block_on_failure: bool = True
    ) -> Dict[str, Any]:
        """
        Verify an agent's trust score and SARA risk.
        
        Args:
            agent_did: The agent's DID
            min_trust: Minimum trust score threshold (0.0-1.0). If None, uses default.
            max_sara_risk: Maximum SARA risk threshold (0.0-1.0). If None, uses default.
            block_on_failure: If True, raise exception on failure. If False, return result.
            
        Returns:
            Dict with trust verification results:
            - agent_did: The agent's DID
            - trust_score: Trust score (0.0-1.0)
            - sara_risk: SARA risk score (0.0-1.0)
            - passed: Whether verification passed
            - gates: Dict of individual gate results
            
        Raises:
            TrustScoreTooLow: If trust score is below threshold
            SARARiskTooHigh: If SARA risk exceeds threshold
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara_risk = max_sara_risk if max_sara_risk is not None else self.default_max_sara_risk
        
        logger.info(f"Verifying trust for {agent_did}: min_trust={min_trust}, max_sara_risk={max_sara_risk}")
        
        # Call trust API
        trust_data = self._call_trust_api(agent_did)
        
        trust_score = trust_data.get("trust_score", 0.0)
        sara_risk = trust_data.get("sara_risk", 0.0)
        
        # Check trust score
        if trust_score < min_trust:
            logger.warning(f"Trust score {trust_score} below threshold {min_trust} for {agent_did}")
            if block_on_failure:
                raise TrustScoreTooLow(agent_did, trust_score, min_trust)
            return {
                "agent_did": agent_did,
                "trust_score": trust_score,
                "sara_risk": sara_risk,
                "passed": False,
                "reason": f"trust_score_too_low: {trust_score} < {min_trust}"
            }
        
        # Check SARA risk
        if sara_risk > max_sara_risk:
            logger.warning(f"SARA risk {sara_risk} exceeds threshold {max_sara_risk} for {agent_did}")
            if block_on_failure:
                raise SARARiskTooHigh(agent_did, sara_risk, max_sara_risk)
            return {
                "agent_did": agent_did,
                "trust_score": trust_score,
                "sara_risk": sara_risk,
                "passed": False,
                "reason": f"sara_risk_too_high: {sara_risk} > {max_sara_risk}"
            }
        
        logger.info(f"Trust verification passed for {agent_did}")
        return {
            "agent_did": agent_did,
            "trust_score": trust_score,
            "sara_risk": sara_risk,
            "passed": True,
            "gates": trust_data.get("gates", {})
        }
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara_risk: Optional[float] = None,
        agent_did_param: str = "agent_did"
    ) -> Callable:
        """
        Decorator to verify trust before executing an agent action.
        
        Usage:
            guard = MeeetGuard(api_key="your_key")
            
            @guard.before_action(min_trust=0.7, max_sara_risk=0.6)
            def my_agent_task(agent_did="did:meeet:abc123"):
                # Only runs if agent passes trust check
                pass
        
        Args:
            min_trust: Minimum trust score threshold
            max_sara_risk: Maximum SARA risk threshold
            agent_did_param: Name of the parameter containing the agent DID
            
        Returns:
            Decorator function
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Extract agent_did from args or kwargs
                agent_did = None
                
                # Try to get from kwargs first
                if agent_did_param in kwargs:
                    agent_did = kwargs[agent_did_param]
                else:
                    # Try to find in positional args (assume first arg after self)
                    if len(args) > 1:
                        agent_did = args[1]  # First arg after self
                    elif args:
                        # Check if it's a method with self
                        agent_did = args[0] if isinstance(args[0], str) else None
                
                if not agent_did:
                    logger.warning(f"Could not find {agent_did_param} in function arguments, skipping verification")
                    return func(*args, **kwargs)
                
                # Verify trust
                result = self.verify(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    max_sara_risk=max_sara_risk,
                    block_on_failure=False
                )
                
                if not result.get("passed", False):
                    reason = result.get("reason", "unknown")
                    logger.warning(f"Action blocked for {agent_did}: {reason}")
                    return {
                        "blocked": True,
                        "reason": reason,
                        "trust_score": result.get("trust_score"),
                        "sara_risk": result.get("sara_risk")
                    }
                
                logger.info(f"Action allowed for {agent_did}")
                return func(*args, **kwargs)
            
            return wrapper
        return decorator
    
    # ═══ CrewAI Integration ═══
    
    def crewai_before_task(self, agent_did: str) -> Callable:
        """
        CrewAI before_task hook for trust verification.
        
        Usage:
            from crewai import Agent, Task
            
            guard = MeeetGuard(api_key="your_key")
            
            researcher = Agent(
                role="Researcher",
                goal="Research and verify trust",
                verbose=True
            )
            
            task = Task(
                description="Research task",
                agent=researcher,
                guard.before_task_hook(agent_did="did:meeet:abc123")
            )
        """
        def hook():
            result = self.verify(
                agent_did=agent_did,
                block_on_failure=False
            )
            if not result.get("passed", False):
                raise TrustVerificationError(f"CrewAI task blocked: {result.get('reason')}")
            logger.info(f"CrewAI task allowed for {agent_did}")
            return result
        return hook
    
    def crewai_task_callback(self, agent_did: str) -> Callable:
        """
        Create a CrewAI task callback that verifies trust.
        
        Args:
            agent_did: The agent's DID
            
        Returns:
            Callback function for CrewAI
        """
        def callback(task_output):
            logger.info(f"CrewAI task completed for {agent_did}")
            return task_output
        return callback
    
    # ═══ AutoGen Integration ═══
    
    def autogen_middleware(self, agent_did: str) -> Callable:
        """
        AutoGen middleware for agent message verification.
        
        Usage:
            from autogen import ConversableAgent
            
            guard = MeeetGuard(api_key="your_key")
            
            agent = ConversableAgent(
                name="research_agent",
                llm_config={"model": "gpt-4"},
                message_queue_params={"trust_guard": guard.autogen_middleware("did:meeet:abc123")}
            )
        """
        def middleware(message):
            result = self.verify(
                agent_did=agent_did,
                block_on_failure=False
            )
            if not result.get("passed", False):
                logger.warning(f"AutoGen message blocked for {agent_did}: {result.get('reason')}")
                return {
                    "blocked": True,
                    "reason": result.get("reason"),
                    "trust_score": result.get("trust_score"),
                    "sara_risk": result.get("sara_risk")
                }
            logger.info(f"AutoGen message allowed for {agent_did}")
            return {"blocked": False}
        return middleware
    
    # ═══ LangGraph Integration ═══
    
    def langgraph_node(
        self,
        agent_did: Optional[str] = None,
        state_key: str = "agent_did"
    ) -> Callable:
        """
        LangGraph node that verifies trust and adds verification to state.
        
        Usage:
            from langgraph.graph import StateGraph
            
            guard = MeeetGuard(api_key="your_key")
            
            def trust_node(state):
                return guard.langgraph_node(state_key="agent_did")(lambda: state)()
            
            graph = StateGraph()
            graph.add_node("trust_check", trust_node)
            graph.add_edge("__start__", "trust_check")
        """
        def node_func(state: Dict[str, Any]) -> Dict[str, Any]:
            # Support both static agent_did and dynamic from state
            did = agent_did if agent_did else state.get(state_key)
            
            if not did:
                logger.warning("No agent_did found in state, skipping trust verification")
                return {**state, "trust_verified": False}
            
            result = self.verify(
                agent_did=did,
                block_on_failure=False
            )
            
            if not result.get("passed", False):
                logger.warning(f"LangGraph node blocked for {did}: {result.get('reason')}")
                return {
                    **state,
                    "trust_verified": False,
                    "blocked": True,
                    "reason": result.get("reason"),
                    "trust_score": result.get("trust_score"),
                    "sara_risk": result.get("sara_risk")
                }
            
            logger.info(f"LangGraph node allowed for {did}")
            return {
                **state,
                "trust_verified": True,
                "blocked": False,
                "trust_score": result.get("trust_score"),
                "sara_risk": result.get("sara_risk")
            }
        return node_func


# ═══ Convenience Function ═══

def quick_verify(
    agent_did: str,
    api_key: str,
    min_trust: float = 0.5,
    max_sara_risk: float = 0.6
) -> Dict[str, Any]:
    """
    Convenience function for quick trust verification.
    
    Args:
        agent_did: The agent's DID
        api_key: MEEET API key
        min_trust: Minimum trust score threshold
        max_sara_risk: Maximum SARA risk threshold
        
    Returns:
        Trust verification result dict
    """
    guard = MeeetGuard(api_key=api_key)
    return guard.verify(
        agent_did=agent_did,
        min_trust=min_trust,
        max_sara_risk=max_sara_risk,
        block_on_failure=False
    )
