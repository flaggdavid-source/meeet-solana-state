"""
MEEET Trust Guard — CrewAI/Agent Framework Adapter

Connect MEEET trust verification to your AI agent framework.
Before any agent action → call meeet.world/api/trust/{agentDid}
If trust score < threshold → block action
If SARA risk > 0.6 → warn or block

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task():
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/trust-api
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

import json
import logging
import os
import urllib.request
from datetime import datetime
from functools import wraps
from typing import Any, Callable, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | MEEET-GUARD | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("meeet_trust")


# ============================================================================
# Configuration
# ============================================================================

DEFAULT_BASE_URL = "https://meeet.world/api"
DEFAULT_TIMEOUT = 30


# ============================================================================
# Exceptions
# ============================================================================

class MeeetTrustError(Exception):
    """Base exception for MEEET Trust errors."""
    pass


class TrustScoreTooLow(MeeetTrustError):
    """Raised when agent trust score is below threshold."""
    def __init__(self, agent_did: str, score: float, threshold: float):
        self.agent_did = agent_did
        self.score = score
        self.threshold = threshold
        super().__init__(
            f"Trust score {score} for {agent_did[:16]}... below threshold {threshold}"
        )


class SaraRiskTooHigh(MeeetTrustError):
    """Raised when SARA risk assessment is above threshold."""
    def __init__(self, agent_did: str, risk_score: float, threshold: float = 0.6):
        self.agent_did = agent_did
        self.risk_score = risk_score
        self.threshold = threshold
        super().__init__(
            f"SARA risk {risk_score} for {agent_did[:16]}... above threshold {threshold}"
        )


class TrustApiError(MeeetTrustError):
    """Raised when Trust API call fails."""
    pass


# ============================================================================
# Trust Response Models
# ============================================================================

class TrustResponse:
    """Parsed trust API response."""
    
    def __init__(
        self,
        agent_did: str,
        trust_score: float,
        sara_risk: float,
        trust_level: str,
        capabilities: list,
        domains: list,
        reputation: int,
        is_verified: bool,
        raw: dict,
    ):
        self.agent_did = agent_did
        self.trust_score = trust_score
        self.sara_risk = sara_risk
        self.trust_level = trust_level
        self.capabilities = capabilities
        self.domains = domains
        self.reputation = reputation
        self.is_verified = is_verified
        self.raw = raw
    
    def __repr__(self):
        return (
            f"TrustResponse(did={self.agent_did[:16]}..., "
            f"score={self.trust_score}, sara={self.sara_risk}, "
            f"level={self.trust_level})"
        )


# ============================================================================
# MeeetGuard Class
# ============================================================================

class MeeetGuard:
    """
    MEEET Trust Guard — validates agent trust before actions.
    
    Example:
        guard = MeeetGuard(api_key="your_key")
        
        @guard.before_action(min_trust=0.7, max_sara=0.6)
        def deploy_agent():
            # Only runs if trust passes
            pass
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = DEFAULT_TIMEOUT,
        log_level: int = logging.INFO,
    ):
        """
        Initialize MeeetGuard.
        
        Args:
            api_key: MEEET API key (optional, reads from MEEET_API_KEY env var)
            base_url: MEEET API base URL
            timeout: Request timeout in seconds
            log_level: Logging level
        """
        self.api_key = api_key or os.getenv("MEEET_API_KEY", "")
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        
        # Configure logger
        logger.setLevel(log_level)
        
        logger.info(f"Initialized MeeetGuard (base_url={base_url})")
    
    def _call_trust_api(self, agent_did: str) -> TrustResponse:
        """
        Call MEEET Trust API for agent verification.
        
        Args:
            agent_did: Agent DID (e.g., "did:meeet:agent123")
        
        Returns:
            TrustResponse with trust score and SARA risk
        
        Raises:
            TrustApiError: If API call fails
        """
        url = f"{self.base_url}/trust/{agent_did}"
        
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        logger.info(f"Calling trust API: {url}")
        
        try:
            req = urllib.request.Request(
                url,
                headers=headers,
                method="GET"
            )
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            raise TrustApiError(f"HTTP {e.code}: {e.reason}")
        except urllib.error.URLError as e:
            raise TrustApiError(f"API call failed: {e.reason}")
        except json.JSONDecodeError as e:
            raise TrustApiError(f"Invalid JSON response: {e}")
        
        # Parse response
        return TrustResponse(
            agent_did=data.get("agent_did", agent_did),
            trust_score=data.get("trust_score", 0.0),
            sara_risk=data.get("sara_risk", data.get("risk_score", 0.0)),
            trust_level=data.get("trust_level", "unknown"),
            capabilities=data.get("capabilities", []),
            domains=data.get("domains", []),
            reputation=data.get("reputation", 0),
            is_verified=data.get("is_verified", False),
            raw=data,
        )
    
    def verify(
        self,
        agent_did: str,
        min_trust: float = 0.0,
        max_sara: float = 1.0,
        block_on_low_trust: bool = True,
        block_on_high_sara: bool = True,
    ) -> TrustResponse:
        """
        Verify agent trust score and SARA risk.
        
        Args:
            agent_did: Agent DID
            min_trust: Minimum trust score (0.0-1.0)
            max_sara: Maximum SARA risk (0.0-1.0)
            block_on_low_trust: Raise error if trust < min_trust
            block_on_high_sara: Raise error if SARA risk > max_sara
        
        Returns:
            TrustResponse if verification passes
        
        Raises:
            TrustScoreTooLow: If trust score below threshold
            SaraRiskTooHigh: If SARA risk above threshold
            TrustApiError: If API call fails
        """
        logger.info(
            f"Verifying agent: {agent_did[:16]}... "
            f"(min_trust={min_trust}, max_sara={max_sara})"
        )
        
        # Call trust API
        response = self._call_trust_api(agent_did)
        
        # Log the result
        logger.info(
            f"Trust check result: score={response.trust_score}, "
            f"sara={response.sara_risk}, level={response.trust_level}"
        )
        
        # Check trust score
        if block_on_low_trust and response.trust_score < min_trust:
            logger.warning(
                f"BLOCKED: {agent_did[:16]}... trust {response.trust_score} "
                f"< {min_trust}"
            )
            raise TrustScoreTooLow(agent_did, response.trust_score, min_trust)
        
        # Check SARA risk
        if block_on_high_sara and response.sara_risk > max_sara:
            logger.warning(
                f"BLOCKED: {agent_did[:16]}... SARA risk {response.sara_risk} "
                f"> {max_sara}"
            )
            raise SaraRiskTooHigh(agent_did, response.sara_risk, max_sara)
        
        logger.info(f"PASSED: {agent_did[:16]}... verified")
        return response
    
    def before_action(
        self,
        min_trust: float = 0.0,
        max_sara: float = 0.6,
        agent_did_param: str = "agent_did",
        block_on_fail: bool = True,
    ) -> Callable:
        """
        Decorator to verify trust before agent action.
        
        Usage:
            guard = MeeetGuard(api_key="key")
            
            @guard.before_action(min_trust=0.7, max_sara=0.6)
            def my_agent_task(agent_did="did:meeet:agent123"):
                # Only runs if agent passes trust check
                pass
        
        Args:
            min_trust: Minimum trust score (0.0-1.0)
            max_sara: Maximum SARA risk threshold (default 0.6)
            agent_did_param: Name of parameter containing agent DID
            block_on_fail: If True, raise exception on failure; if False, log warning
        
        Returns:
            Decorated function
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Extract agent_did from args/kwargs
                params = {**dict(zip(func.__code__.co_varnames, args)), **kwargs}
                agent_did = params.get(agent_did_param)
                
                if not agent_did:
                    if block_on_fail:
                        raise MeeetTrustError(
                            f"Missing required parameter: {agent_did_param}"
                        )
                    else:
                        logger.warning(
                            f"Missing {agent_did_param}, skipping trust check"
                        )
                        return func(*args, **kwargs)
                
                try:
                    self.verify(
                        agent_did=agent_did,
                        min_trust=min_trust,
                        max_sara=max_sara,
                        block_on_low_trust=block_on_fail,
                        block_on_high_sara=block_on_fail,
                    )
                except MeeetTrustError as e:
                    if block_on_fail:
                        raise
                    else:
                        logger.warning(f"Trust check failed: {e}")
                        return None
                
                return func(*args, **kwargs)
            
            return wrapper
        return decorator
    
    def crewai_taskDecorator(
        self,
        min_trust: float = 0.7,
        max_sara: float = 0.6,
    ) -> Callable:
        """
        CrewAI task callback hook — runs before task execution.
        
        Usage:
            from crewai import Task
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="key")
            
            research_task = Task(
                description="Research task",
                agent=researcher,
                callback=guard.crewai_taskDecorator(min_trust=0.7)
            )
        
        Args:
            min_trust: Minimum trust score
            max_sara: Maximum SARA risk
        
        Returns:
            Callback function for CrewAI
        """
        def callback(task_output, agent, context):
            """CrewAI task callback."""
            agent_did = getattr(agent, "agent_did", None) or getattr(
                agent, "id", None
            )
            
            if not agent_did:
                logger.warning("No agent_did found, skipping trust check")
                return task_output
            
            try:
                self.verify(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    max_sara=max_sara,
                    block_on_low_trust=True,
                    block_on_high_sara=True,
                )
            except MeeetTrustError as e:
                logger.error(f"Task blocked: {e}")
                raise
            
            return task_output
        
        return callback
    
    def autogen_middleware(self, min_trust: float = 0.7, max_sara: float = 0.6):
        """
        AutoGen agent middleware — wraps agent calls with trust verification.
        
        Usage:
            from autogen import ConversableAgent
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="key")
            guard_fn = guard.autogen_middleware(min_trust=0.7)
            
            agent = ConversableAgent(
                name="researcher",
                llm_config=llm_config,
                hook=[guard_fn]
            )
        
        Args:
            min_trust: Minimum trust score
            max_sara: Maximum SARA risk
        
        Returns:
            Middleware function for AutoGen
        """
        def middleware(agent, message, context):
            """AutoGen middleware function."""
            agent_did = getattr(agent, "agent_did", None) or getattr(
                agent, "id", None
            )
            
            if not agent_did:
                logger.warning("No agent_did, skipping trust check")
                return message
            
            self.verify(
                agent_did=agent_did,
                min_trust=min_trust,
                max_sara=max_sara,
                block_on_low_trust=True,
                block_on_high_sara=True,
            )
            
            return message
        
        return middleware
    
    def langgraph_node(
        self,
        min_trust: float = 0.7,
        max_sara: float = 0.6,
        state_key: str = "agent_did",
    ):
        """
        LangGraph node — trust verification as graph node.
        
        Usage:
            from langgraph.graph import END
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="key")
            
            def trust_node(state):
                agent_did = state.get("agent_did")
                return guard.verify(agent_did, min_trust=0.7)
            
            graph.add_node("trust_check", trust_node)
            graph.add_edge("trust_check", "execute_task")
        
        Args:
            min_trust: Minimum trust score
            max_sara: Maximum SARA risk
            state_key: Key in state dict containing agent DID
        
        Returns:
            Node function for LangGraph
        """
        def node(state: dict) -> dict:
            """LangGraph node function."""
            agent_did = state.get(state_key)
            
            if not agent_did:
                raise MeeetTrustError(f"Missing {state_key} in state")
            
            response = self.verify(
                agent_did=agent_did,
                min_trust=min_trust,
                max_sara=max_sara,
                block_on_low_trust=True,
                block_on_high_sara=True,
            )
            
            # Add trust info to state
            return {
                **state,
                "trust_score": response.trust_score,
                "sara_risk": response.sara_risk,
                "trust_level": response.trust_level,
                "trust_verified": True,
            }
        
        return node


# ============================================================================
# Convenience Functions
# ============================================================================

def quick_verify(
    agent_did: str,
    api_key: Optional[str] = None,
    min_trust: float = 0.7,
    max_sara: float = 0.6,
) -> TrustResponse:
    """
    Quick trust verification — one-liner function.
    
    Usage:
        from meeet_trust import quick_verify
        
        result = quick_verify("did:meeet:agent123", min_trust=0.7)
        print(f"Trust: {result.trust_score}")
    
    Args:
        agent_did: Agent DID
        api_key: Optional API key
        min_trust: Minimum trust score
        max_sara: Maximum SARA risk
    
    Returns:
        TrustResponse
    """
    guard = MeeetGuard(api_key=api_key)
    return guard.verify(
        agent_did=agent_did,
        min_trust=min_trust,
        max_sara=max_sara,
    )


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    print("🛡️  MEEET Trust Guard")
    print("=" * 40)
    print("Ready to verify agent trust scores")
    print()
    print("Example usage:")
    print("  from meeet_trust import MeeetGuard")
    print("  guard = MeeetGuard(api_key='your_key')")
    print("  result = guard.verify('did:meeet:agent123', min_trust=0.7)")
    print(f"  → {result}")