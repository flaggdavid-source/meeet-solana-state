"""
MEEET Trust Guard — Verify agent trust before AI agent actions.

This package provides integration adapters for:
- CrewAI (before_task hook)
- AutoGen (agent verification middleware)
- LangGraph (trust verification node)

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task(agent_did):
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/trust-api
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

import functools
import logging
import urllib.error
import urllib.request
import json
from typing import Any, Callable, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Default API URLs
DEFAULT_TRUST_API_URL = "https://meeet.world/api/trust"
DEFAULT_SARA_API_URL = "https://meeet.world/api/sara"


class TrustVerificationError(Exception):
    """Base exception for trust verification failures."""
    pass


class TrustScoreTooLow(TrustVerificationError):
    """Raised when trust score is below the required threshold."""
    def __init__(self, trust_score: float, threshold: float):
        self.trust_score = trust_score
        self.threshold = threshold
        super().__init__(f"Trust score {trust_score:.2f} is below threshold {threshold:.2f}")


class SARARiskTooHigh(TrustVerificationError):
    """Raised when SARA risk score exceeds the maximum threshold."""
    def __init__(self, sara_risk: float, max_threshold: float):
        self.sara_risk = sara_risk
        self.max_threshold = max_threshold
        super().__init__(f"SARA risk {sara_risk:.2f} exceeds maximum {max_threshold:.2f}")


class MeeetGuard:
    """
    MEEET Trust Guard — Verify agent trust before actions.
    
    This class provides decorators and utilities to integrate MEEET's
    7-gate trust verification into AI agent frameworks.
    
    Args:
        api_key: MEEET API key for authentication
        trust_api_url: Optional custom trust API endpoint
        sara_api_url: Optional custom SARA API endpoint
        default_min_trust: Default minimum trust score (0.0-1.0)
        default_max_sara: Default maximum SARA risk (0.0-1.0)
        block_on_low_trust: Whether to block action if trust too low
        block_on_high_sara: Whether to block action if SARA risk too high
    """
    
    def __init__(
        self,
        api_key: str,
        trust_api_url: str = DEFAULT_TRUST_API_URL,
        sara_api_url: str = DEFAULT_SARA_API_URL,
        default_min_trust: float = 0.5,
        default_max_sara: float = 0.6,
        block_on_low_trust: bool = True,
        block_on_high_sara: bool = False,
    ):
        self.api_key = api_key
        self.trust_api_url = trust_api_url
        self.sara_api_url = sara_api_url
        self.default_min_trust = default_min_trust
        self.default_max_sara = default_max_sara
        self.block_on_low_trust = block_on_low_trust
        self.block_on_high_sara = block_on_high_sara
        
        logger.info(f"MeeetGuard initialized with api_key={api_key[:8]}...")
    
    def get_trust_score(self, agent_did: str) -> Dict[str, Any]:
        """
        Call the MEEET trust API to get agent trust score.
        
        Args:
            agent_did: The agent's DID (decentralized identifier)
            
        Returns:
            Dict with trust_score and other trust data
        """
        url = f"{self.trust_api_url}/{agent_did}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
                logger.info(f"Trust score for {agent_did}: {data.get('trust_score', 'N/A')}")
                return data
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else "Unknown error"
            logger.error(f"Trust API HTTP error {e.code}: {error_body}")
            raise TrustVerificationError(f"Trust API error: {e.code} - {error_body}")
        except Exception as e:
            logger.error(f"Trust API call failed: {e}")
            raise TrustVerificationError(f"Trust API call failed: {e}")
    
    def get_sara_risk(self, agent_did: str) -> Dict[str, Any]:
        """
        Call the MEEET SARA API to get agent risk assessment.
        
        Args:
            agent_did: The agent's DID (decentralized identifier)
            
        Returns:
            Dict with sara_risk and other risk assessment data.
        """
        url = f"{self.sara_api_url}/{agent_did}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
                logger.info(f"SARA risk for {agent_did}: {data.get('sara_risk', 'N/A')}")
                return data
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else "Unknown error"
            logger.error(f"SARA API HTTP error {e.code}: {error_body}")
            raise TrustVerificationError(f"SARA API error: {e.code} - {error_body}")
        except Exception as e:
            logger.error(f"SARA API call failed: {e}")
            raise TrustVerificationError(f"SARA API call failed: {e}")
    
    def verify_trust(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Verify agent trust using MEEET's 7-gate trust API.
        
        Args:
            agent_did: The agent's DID (decentralized identifier)
            min_trust: Minimum trust score required (0.0-1.0)
            max_sara: Maximum SARA risk allowed (0.0-1.0)
            
        Returns:
            Dict with trust_score, sara_risk, and verification results
            
        Raises:
            TrustScoreTooLow: If trust score is below threshold
            SARARiskTooHigh: If SARA risk exceeds threshold
            TrustVerificationError: If API calls fail
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara = max_sara if max_sara is not None else self.default_max_sara
        
        logger.info(f"Verifying trust for {agent_did} (min_trust={min_trust}, max_sara={max_sara})")
        
        # Get trust score
        trust_data = self.get_trust_score(agent_did)
        trust_score = trust_data.get("trust_score", 0.0)
        
        # Get SARA risk
        sara_data = self.get_sara_risk(agent_did)
        sara_risk = sara_data.get("sara_risk", 0.0)
        
        # Check trust score
        trust_verified = trust_score >= min_trust
        if not trust_verified and self.block_on_low_trust:
            logger.warning(f"Trust score {trust_score:.2f} below threshold {min_trust}")
            raise TrustScoreTooLow(trust_score, min_trust)
        
        # Check SARA risk
        sara_verified = sara_risk <= max_sara
        if not sara_verified and self.block_on_high_sara:
            logger.warning(f"SARA risk {sara_risk:.2f} exceeds maximum {max_sara}")
            raise SARARiskTooHigh(sara_risk, max_sara)
        
        result = {
            "agent_did": agent_did,
            "trust_score": trust_score,
            "sara_risk": sara_risk,
            "trust_verified": trust_verified,
            "sara_verified": sara_verified,
            "trust_data": trust_data,
            "sara_data": sara_data,
        }
        
        if trust_verified and sara_verified:
            logger.info(f"✅ Trust verified for {agent_did}: trust={trust_score:.2f}, sara={sara_risk:.2f}")
        else:
            logger.warning(
                f"⚠️ Trust verification issues for {agent_did}: "
                f"trust={trust_score:.2f} (verified={trust_verified}), "
                f"sara={sara_risk:.2f} (verified={sara_verified})"
            )
        
        return result
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
    ) -> Callable:
        """
        Decorator to verify trust before an agent action.
        
        Usage:
            guard = MeeetGuard(api_key="your_key")
            
            @guard.before_action(min_trust=0.7)
            def my_agent_task(agent_did):
                # Only runs if agent passes 7-gate check
                pass
        
        Args:
            min_trust: Minimum trust score required
            max_sara: Maximum SARA risk allowed
            
        Returns:
            Decorator function
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(agent_did: str, *args, **kwargs):
                # Verify trust before action
                self.verify_trust(agent_did, min_trust, max_sara)
                # Execute the action
                return func(agent_did, *args, **kwargs)
            return wrapper
        return decorator
    
    def crewai_before_task(self, min_trust: Optional[float] = None, max_sara: Optional[float] = None):
        """
        CrewAI before_task hook integration.
        
        Usage:
            from crewai import Agent, Task
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            researcher = Agent(
                role="Researcher",
                goal="Research something",
                backstory="You are a researcher",
                before_task_hook=guard.crewai_before_task(min_trust=0.7)
            )
        
        Args:
            min_trust: Minimum trust score required
            max_sara: Maximum SARA risk allowed
            
        Returns:
            Hook function for CrewAI
        """
        def hook(task):
            agent_did = task.agent.did if hasattr(task.agent, 'did') else getattr(task.agent, 'agent_did', '')
            if not agent_did:
                logger.warning("No agent DID found, skipping trust verification")
                return
            self.verify_trust(agent_did, min_trust, max_sara)
        return hook
    
    def autogen_middleware(self, min_trust: Optional[float] = None, max_sara: Optional[float] = None):
        """
        AutoGen agent verification middleware.
        
        Usage:
            from autogen import ConversableAgent
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            agent = ConversableAgent(
                name="assistant",
                llm_config={...},
                middleware=guard.autogen_middleware(min_trust=0.7)
            )
        
        Args:
            min_trust: Minimum trust score required
            max_sara: Maximum SARA risk allowed
            
        Returns:
            Middleware function for AutoGen
        """
        def middleware(agent, message):
            agent_did = getattr(agent, 'did', None) or getattr(agent, 'agent_did', '')
            if not agent_did:
                logger.warning("No agent DID found, skipping trust verification")
                return True  # Allow by default
            try:
                self.verify_trust(agent_did, min_trust, max_sara)
                return True  # Allow
            except TrustVerificationError as e:
                logger.error(f"Trust verification blocked: {e}")
                return False  # Block
        return middleware
    
    def langgraph_node(self, min_trust: Optional[float] = None, max_sara: Optional[float] = None):
        """
        LangGraph node that verifies trust before proceeding.
        
        Usage:
            from langgraph.graph import StateGraph
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            def verify_trust_node(state):
                agent_did = state.get("agent_did", "")
                return guard.verify_trust(agent_did, min_trust=0.7)
            
            graph.add_node("verify_trust", verify_trust_node)
        
        Args:
            min_trust: Minimum trust score required
            max_sara: Maximum SARA risk allowed
            
        Returns:
            Node function for LangGraph
        """
        def node(state: Dict[str, Any]) -> Dict[str, Any]:
            agent_did = state.get("agent_did", "")
            if not agent_did:
                logger.warning("No agent_did in state, skipping trust verification")
                return {**state, "trust_verified": False, "trust_error": "No agent_did"}
            
            try:
                result = self.verify_trust(agent_did, min_trust, max_sara)
                return {
                    **state,
                    "trust_verified": result["trust_verified"],
                    "trust_score": result["trust_score"],
                    "sara_risk": result["sara_risk"],
                }
            except TrustVerificationError as e:
                logger.error(f"Trust verification failed: {e}")
                return {
                    **state,
                    "trust_verified": False,
                    "trust_error": str(e),
                }
        return node


# Export public API
__all__ = [
    "MeeetGuard",
    "TrustVerificationError",
    "TrustScoreTooLow",
    "SARARiskTooHigh",
]
