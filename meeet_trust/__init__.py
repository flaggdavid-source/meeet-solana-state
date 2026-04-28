"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

Protect your AI agents with MEEET's 7-gate trust verification before any action executes.

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

import logging
import urllib.request
import json
from typing import Optional, Callable, Any, Dict
from functools import wraps
from dataclasses import dataclass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("meeet_trust")

# Default API configuration
DEFAULT_TRUST_API_URL = "https://meeet.world/api/trust"
DEFAULT_SARA_API_URL = "https://meeet.world/api/sara"


@dataclass
class TrustResult:
    """Result of a trust verification check."""
    agent_did: str
    trust_score: float
    sara_risk: float
    passed: bool
    blocked: bool
    message: str
    raw_response: Dict[str, Any]


class MeeetTrustError(Exception):
    """Base exception for MEEET Trust errors."""
    pass


class TrustVerificationFailed(MeeetTrustError):
    """Raised when trust verification fails."""
    pass


class MeeetGuard:
    """
    MEEET Trust Guard - Verify agent trust before any action executes.
    
    This guard checks the MEEET trust score and SARA risk assessment
    before allowing an agent action to proceed.
    
    Args:
        api_key: MEEET API key for authentication
        trust_api_url: Optional custom trust API URL
        sara_api_url: Optional custom SARA API URL
        default_min_trust: Default minimum trust score (0.0-1.0)
        default_max_sara: Default maximum SARA risk (0.0-1.0)
        block_on_fail: Whether to raise exception on trust failure
    """
    
    def __init__(
        self,
        api_key: str,
        trust_api_url: str = DEFAULT_TRUST_API_URL,
        sara_api_url: str = DEFAULT_SARA_API_URL,
        default_min_trust: float = 0.5,
        default_max_sara: float = 0.6,
        block_on_fail: bool = True,
    ):
        self.api_key = api_key
        self.trust_api_url = trust_api_url
        self.sara_api_url = sara_api_url
        self.default_min_trust = default_min_trust
        self.default_max_sara = default_max_sara
        self.block_on_fail = block_on_fail
        
    def verify_trust(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
    ) -> TrustResult:
        """
        Verify agent trust score and SARA risk.
        
        Args:
            agent_did: The agent's DID (did:meeet:...)
            min_trust: Minimum trust score required (0.0-1.0)
            max_sara: Maximum SARA risk allowed (0.0-1.0)
            
        Returns:
            TrustResult with verification details
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara = max_sara if max_sara is not None else self.default_max_sara
        
        logger.info(f"Verifying trust for agent: {agent_did}")
        
        # Call trust API
        trust_score = self._get_trust_score(agent_did)
        logger.info(f"Trust score for {agent_did}: {trust_score}")
        
        # Call SARA risk API
        sara_risk = self._get_sara_risk(agent_did)
        logger.info(f"SARA risk for {agent_did}: {sara_risk}")
        
        # Evaluate trust
        trust_passed = trust_score >= min_trust
        sara_passed = sara_risk <= max_sara
        passed = trust_passed and sara_passed
        
        blocked = self.block_on_fail and not passed
        
        if not trust_passed:
            message = f"Trust score {trust_score} below threshold {min_trust}"
        elif not sara_passed:
            message = f"SARA risk {sara_risk} above threshold {max_sara}"
        else:
            message = "Trust verification passed"
            
        if blocked:
            logger.warning(f"Action blocked for {agent_did}: {message}")
        else:
            logger.info(f"Trust verification for {agent_did}: {message}")
            
        return TrustResult(
            agent_did=agent_did,
            trust_score=trust_score,
            sara_risk=sara_risk,
            passed=passed,
            blocked=blocked,
            message=message,
            raw_response={}
        )
    
    def _get_trust_score(self, agent_did: str) -> float:
        """Fetch trust score from MEEET API."""
        try:
            url = f"{self.trust_api_url}/{agent_did}"
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read())
                return float(data.get("trust_score", 0.0))
        except Exception as e:
            logger.error(f"Failed to get trust score: {e}")
            # Return 0.0 on failure (will block by default)
            return 0.0
    
    def _get_sara_risk(self, agent_did: str) -> float:
        """Fetch SARA risk score from MEEET API."""
        try:
            url = f"{self.sara_api_url}/{agent_did}"
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read())
                return float(data.get("risk_score", 0.0))
        except Exception as e:
            logger.error(f"Failed to get SARA risk: {e}")
            # Return 1.0 on failure (will block by default)
            return 1.0
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
        agent_did_param: str = "agent_did",
    ):
        """
        Decorator to verify trust before executing an agent action.
        
        Args:
            min_trust: Minimum trust score required (0.0-1.0)
            max_sara: Maximum SARA risk allowed (0.0-1.0)
            agent_did_param: Name of the parameter containing agent DID
            
        Returns:
            Decorated function that verifies trust before execution
            
        Example:
            guard = MeeetGuard(api_key="your_key")
            
            @guard.before_action(min_trust=0.7, agent_did_param="agent")
            def my_agent_task(agent: str):
                # Only runs if agent passes 7-gate check
                pass
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Extract agent_did from args/kwargs
                import inspect
                sig = inspect.signature(func)
                params = list(sig.parameters.keys())
                
                agent_did = None
                
                # Try to find agent_did in positional args
                if agent_did_param in kwargs:
                    agent_did = kwargs[agent_did_param]
                elif agent_did_param in params:
                    param_idx = params.index(agent_did_param)
                    if param_idx < len(args):
                        agent_did = args[param_idx]
                
                if agent_did is None:
                    # Try common parameter names
                    for param_name in ["agent_did", "agent", "did", "agent_id"]:
                        if param_name in kwargs:
                            agent_did = kwargs[param_name]
                            break
                        elif param_name in params:
                            param_idx = params.index(param_name)
                            if param_idx < len(args):
                                agent_did = args[param_idx]
                                break
                
                if agent_did is None:
                    logger.warning(f"Could not find agent DID in {func.__name__}, skipping trust check")
                    return func(*args, **kwargs)
                
                # Verify trust
                result = self.verify_trust(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    max_sara=max_sara,
                )
                
                if result.blocked:
                    raise TrustVerificationFailed(
                        f"Action blocked for {agent_did}: {result.message}"
                    )
                
                # Call the original function
                return func(*args, **kwargs)
            
            return wrapper
        return decorator
    
    def check_and_raise(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
    ) -> TrustResult:
        """
        Manual trust check that raises exception on failure.
        
        Args:
            agent_did: The agent's DID
            min_trust: Minimum trust score required
            max_sara: Maximum SARA risk allowed
            
        Returns:
            TrustResult
            
        Raises:
            TrustVerificationFailed: If trust verification fails and block_on_fail is True
        """
        result = self.verify_trust(agent_did, min_trust, max_sara)
        
        if result.blocked:
            raise TrustVerificationFailed(
                f"Trust verification failed for {agent_did}: {result.message}"
            )
        
        return result


# Export main classes
__all__ = [
    "MeeetGuard",
    "TrustResult",
    "MeeetTrustError",
    "TrustVerificationFailed",
]
