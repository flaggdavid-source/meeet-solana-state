"""
MEEET Trust Guard — Core trust verification logic

Provides trust score checking via MEEET's 7-gate trust API.
Supports CrewAI before_task hooks, AutoGen middleware, and LangGraph nodes.
"""

import json
import logging
import os
import time
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("meeet_trust")


# ═══ Configuration ═══
DEFAULT_TRUST_API_URL = "https://meeet.world/api/trust"
DEFAULT_TIMEOUT = 30


# ═══ Exceptions ═══
class TrustCheckError(Exception):
    """Base exception for trust check failures."""
    pass


class TrustScoreTooLow(TrustCheckError):
    """Raised when agent's trust score is below threshold."""
    
    def __init__(self, agent_did: str, trust_score: float, min_trust: float):
        self.agent_did = agent_did
        self.trust_score = trust_score
        self.min_trust = min_trust
        super().__init__(
            f"Trust score {trust_score:.2f} for {agent_did} is below minimum {min_trust}"
        )


class SaraRiskTooHigh(TrustCheckError):
    """Raised when SARA risk assessment is too high."""
    
    def __init__(self, agent_did: str, sara_risk: float, max_risk: float):
        self.agent_did = agent_did
        self.sara_risk = sara_risk
        self.max_risk = max_risk
        super().__init__(
            f"SARA risk {sara_risk:.2f} for {agent_did} exceeds maximum {max_risk}"
        )


class ApiError(TrustCheckError):
    """Raised when MEEET API returns an error."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.status_code = status_code
        super().__init__(message)


# ═══ Data Classes ═══
@dataclass
class TrustScore:
    """Trust score response from MEEET API."""
    agent_did: str
    trust_score: float
    sara_risk: float
    aps_level: int
    bayesian_mu: float
    bayesian_sigma: float
    economic_score: float
    social_score: float
    layers_verified: List[str] = field(default_factory=list)
    timestamp: str = ""
    
    @property
    def passed_7_gate(self) -> bool:
        """Check if agent passed all 7 trust gates."""
        required_layers = {"L1", "L2", "L2.5", "L3", "L4", "L5", "L6"}
        return required_layers.issubset(set(self.layers_verified))


@dataclass
class TrustCheckResult:
    """Result of a trust check operation."""
    allowed: bool
    trust_score: Optional[TrustScore] = None
    error: Optional[str] = None
    blocked_reason: Optional[str] = None


# ═══ Main Guard Class ═══
class MeeetGuard:
    """
    MEEET Trust Guard for AI Agent Frameworks.
    
    Provides trust verification before agent actions using MEEET's 7-gate trust system.
    
    Args:
        api_key: MEEET API key for authentication
        api_url: Base URL for trust API (default: https://meeet.world/api/trust)
        default_min_trust: Default minimum trust score (0.0-1.0)
        default_max_risk: Default maximum SARA risk (0.0-1.0)
        timeout: Request timeout in seconds
        cache_ttl: Cache trust scores for this many seconds (0 = no cache)
    
    Example:
        >>> guard = MeeetGuard(api_key="your_key")
        >>> @guard.before_action(min_trust=0.7)
        ... def my_task():
        ...     pass
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_url: str = DEFAULT_TRUST_API_URL,
        default_min_trust: float = 0.5,
        default_max_risk: float = 0.6,
        timeout: int = DEFAULT_TIMEOUT,
        cache_ttl: int = 300,
    ):
        self.api_key = api_key or os.environ.get("MEEET_API_KEY", "")
        self.api_url = api_url.rstrip("/")
        self.default_min_trust = default_min_trust
        self.default_max_risk = default_max_risk
        self.timeout = timeout
        self.cache_ttl = cache_ttl
        
        # Cache: {agent_did: (timestamp, TrustScore)}
        self._cache: Dict[str, tuple] = {}
        
        logger.info(f"MeeetGuard initialized (min_trust={default_min_trust}, max_risk={default_max_risk})")
    
    def _get_cached(self, agent_did: str) -> Optional[TrustScore]:
        """Get cached trust score if still valid."""
        if self.cache_ttl <= 0 or agent_did not in self._cache:
            return None
        
        timestamp, score = self._cache[agent_did]
        if time.time() - timestamp < self.cache_ttl:
            logger.debug(f"Cache hit for {agent_did}")
            return score
        
        del self._cache[agent_did]
        return None
    
    def _set_cached(self, agent_did: str, score: TrustScore) -> None:
        """Cache trust score."""
        if self.cache_ttl > 0:
            self._cache[agent_did] = (time.time(), score)
    
    def _call_api(self, agent_did: str) -> Dict:
        """Call MEEET trust API."""
        url = f"{self.api_url}/{agent_did}"
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        logger.info(f"Calling trust API: {url}")
        
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode())
                return data
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else ""
            logger.error(f"API error {e.code}: {body}")
            try:
                error_data = json.loads(body)
                raise ApiError(error_data.get("error", str(e)), e.code)
            except json.JSONDecodeError:
                raise ApiError(f"HTTP {e.code}: {body}", e.code)
        except urllib.error.URLError as e:
            logger.error(f"URL error: {e.reason}")
            raise ApiError(f"Failed to connect: {e.reason}")
    
    def get_trust_score(self, agent_did: str, use_cache: bool = True) -> TrustScore:
        """
        Get trust score for an agent.
        
        Args:
            agent_did: Agent's DID (e.g., "did:meeet:agent123")
            use_cache: Whether to use cached results
        
        Returns:
            TrustScore object with trust score and SARA risk
        
        Raises:
            ApiError: If API call fails
        """
        # Check cache
        if use_cache:
            cached = self._get_cached(agent_did)
            if cached:
                return cached
        
        # Call API
        data = self._call_api(agent_did)
        
        # Parse response
        score = TrustScore(
            agent_did=agent_did,
            trust_score=data.get("trust_score", data.get("score", 0.0)),
            sara_risk=data.get("sara_risk", data.get("risk", 0.0)),
            aps_level=data.get("aps_level", data.get("level", 0)),
            bayesian_mu=data.get("bayesian", {}).get("mu", 0.5),
            bayesian_sigma=data.get("bayesian", {}).get("sigma", 0.3),
            economic_score=data.get("economic", {}).get("score", 0.0),
            social_score=data.get("social", {}).get("score", 0.5),
            layers_verified=data.get("layers_verified", data.get("layers", [])),
            timestamp=data.get("timestamp", ""),
        )
        
        # Cache result
        self._set_cached(agent_did, score)
        
        logger.info(
            f"Trust score for {agent_did}: {score.trust_score:.2f}, "
            f"SARA risk: {score.sara_risk:.2f}, 7-gate: {score.passed_7_gate}"
        )
        
        return score
    
    def check_trust(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_risk: Optional[float] = None,
        require_7_gate: bool = False,
    ) -> TrustCheckResult:
        """
        Check if agent passes trust requirements.
        
        Args:
            agent_did: Agent's DID
            min_trust: Minimum trust score (0.0-1.0)
            max_risk: Maximum SARA risk (0.0-1.0)
            require_7_gate: Require all 7 trust layers verified
        
        Returns:
            TrustCheckResult with allowed status and details
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_risk = max_risk if max_risk is not None else self.default_max_risk
        
        try:
            score = self.get_trust_score(agent_did)
            
            # Check trust score
            if score.trust_score < min_trust:
                logger.warning(
                    f"Blocked {agent_did}: trust {score.trust_score:.2f} < {min_trust}"
                )
                return TrustCheckResult(
                    allowed=False,
                    trust_score=score,
                    blocked_reason=f"trust_score_too_low: {score.trust_score:.2f} < {min_trust}",
                )
            
            # Check SARA risk
            if score.sara_risk > max_risk:
                logger.warning(
                    f"Blocked {agent_did}: SARA risk {score.sara_risk:.2f} > {max_risk}"
                )
                return TrustCheckResult(
                    allowed=False,
                    trust_score=score,
                    blocked_reason=f"sara_risk_too_high: {score.sara_risk:.2f} > {max_risk}",
                )
            
            # Check 7-gate
            if require_7_gate and not score.passed_7_gate:
                logger.warning(f"Blocked {agent_did}: not all 7 gates verified")
                return TrustCheckResult(
                    allowed=False,
                    trust_score=score,
                    blocked_reason="7_gate_not_passed",
                )
            
            logger.info(f"Allowed {agent_did}: trust={score.trust_score:.2f}, risk={score.sara_risk:.2f}")
            return TrustCheckResult(allowed=True, trust_score=score)
            
        except TrustCheckError as e:
            logger.error(f"Trust check failed for {agent_did}: {e}")
            return TrustCheckResult(allowed=False, error=str(e))
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_risk: Optional[float] = None,
        require_7_gate: bool = False,
        agent_did_param: str = "agent_did",
    ) -> Callable:
        """
        Decorator for CrewAI before_task hook or any agent action.
        
        Args:
            min_trust: Minimum trust score required
            max_risk: Maximum SARA risk allowed
            require_7_gate: Require all 7 trust layers
            agent_did_param: Name of parameter containing agent DID
        
        Returns:
            Decorated function that only executes if trust check passes
        
        Example:
            >>> guard = MeeetGuard(api_key="key")
            >>> @guard.before_action(min_trust=0.7)
            ... def research_task(agent_did, task):
            ...     # Only runs if agent passes trust check
            ...     pass
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Extract agent_did from args/kwargs
                import inspect
                sig = inspect.signature(func)
                params = list(sig.parameters.keys())
                
                agent_did = kwargs.get(agent_did_param)
                if not agent_did and params and agent_did_param in params:
                    idx = params.index(agent_did_param)
                    if idx < len(args):
                        agent_did = args[idx]
                
                if not agent_did:
                    raise TrustCheckError(
                        f"Could not find {agent_did_param} in function arguments. "
                        f"Available: {params}"
                    )
                
                result = self.check_trust(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    max_risk=max_risk,
                    require_7_gate=require_7_gate,
                )
                
                if not result.allowed:
                    blocked_reason = result.blocked_reason or result.error or "unknown"
                    logger.info(f"Action blocked for {agent_did}: {blocked_reason}")
                    # Return None to indicate blocked (CrewAI compatible)
                    return None
                
                # Execute the actual function
                return func(*args, **kwargs)
            
            # Attach metadata for framework integration
            wrapper._meeet_guard = True
            wrapper._min_trust = min_trust
            wrapper._max_risk = max_risk
            wrapper._require_7_gate = require_7_gate
            
            return wrapper
        return decorator
    
    def crewai_before_task(self, agent_did: str) -> bool:
        """
        CrewAI before_task hook integration.
        
        Call this in your CrewAI agent's before_task callback.
        
        Args:
            agent_did: The agent's DID
        
        Returns:
            True if task should proceed, False if blocked
        
        Example:
            >>> from crewai import Agent
            >>> from meeet_trust import MeeetGuard
            >>> 
            >>> guard = MeeetGuard(api_key="key")
            >>> 
            >>> researcher = Agent(
            ...     role="Researcher",
            ...     before_task=guard.crewai_before_task
            ... )
        """
        result = self.check_trust(agent_did)
        return result.allowed
    
    def langgraph_node(self, state: Dict) -> Dict:
        """
        LangGraph node for trust verification.
        
        Add this as a node in your LangGraph state machine.
        
        Args:
            state: Graph state containing 'agent_did'
        
        Returns:
            Updated state with trust check result
        
        Example:
            >>> from meeet_trust import MeeetGuard
            >>> guard = MeeetGuard(api_key="key")
            >>> 
            >>> def check_trust_node(state):
            ...     return guard.langgraph_node(state)
            >>> 
            >>> graph.add_node("check_trust", check_trust_node)
        """
        agent_did = state.get("agent_did")
        if not agent_did:
            state["trust_allowed"] = False
            state["trust_error"] = "No agent_did in state"
            return state
        
        result = self.check_trust(agent_did)
        state["trust_allowed"] = result.allowed
        state["trust_score"] = result.trust_score.trust_score if result.trust_score else None
        state["sara_risk"] = result.trust_score.sara_risk if result.trust_score else None
        state["trust_error"] = result.error or result.blocked_reason
        
        return state
    
    def autogen_middleware(self, agent_did: str, tool_name: str = "") -> bool:
        """
        AutoGen middleware for agent verification.
        
        Call this before any tool execution in AutoGen.
        
        Args:
            agent_did: The agent's DID
            tool_name: Name of tool being executed
        
        Returns:
            True if execution allowed, False if blocked
        
        Example:
            >>> from meeet_trust import MeeetGuard
            >>> guard = MeeetGuard(api_key="key")
            >>> 
            >>> # In AutoGen agent config:
            >>> # "before_tool_execution": lambda name, agent_did: guard.autogen_middleware(agent_did, name)
        """
        logger.info(f"AutoGen middleware check for {agent_did}, tool: {tool_name}")
        result = self.check_trust(agent_did)
        return result.allowed
    
    def clear_cache(self, agent_did: Optional[str] = None) -> None:
        """
        Clear trust score cache.
        
        Args:
            agent_did: Specific agent to clear, or None to clear all
        """
        if agent_did:
            self._cache.pop(agent_did, None)
            logger.debug(f"Cleared cache for {agent_did}")
        else:
            self._cache.clear()
            logger.debug("Cleared all cache")


# ═══ Convenience Functions ═══
def check_trust(
    agent_did: str,
    api_key: Optional[str] = None,
    min_trust: float = 0.5,
    max_risk: float = 0.6,
) -> TrustCheckResult:
    """
    Quick trust check function.
    
    Args:
        agent_did: Agent's DID
        api_key: MEEET API key
        min_trust: Minimum trust score
        max_risk: Maximum SARA risk
    
    Returns:
        TrustCheckResult
    """
    guard = MeeetGuard(api_key=api_key, default_min_trust=min_trust, default_max_risk=max_risk)
    return guard.check_trust(agent_did)
