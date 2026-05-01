"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI/AutoGen/LangGraph

    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_api_key")
    
    @guard.before_action(min_trust=0.7, sara_threshold=0.6)
    def my_agent_task(agent):
        # Only runs if agent passes 7-gate trust check
        pass

Docs: https://meeet.world/trust-api
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

import logging
import urllib.request
import urllib.error
import json
import hashlib
from typing import Optional, Callable, Any, Dict
from functools import wraps
from datetime import datetime, timedelta
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | MEEET-GARD | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("meeet_trust")


class TrustAction(Enum):
    """Actions that require trust verification."""
    AGENT_TASK = "agent_task"
    TOOL_USE = "tool_use"
    MESSAGE_SEND = "message_send"
    DATA_ACCESS = "data_access"
    EXECUTE_CODE = "execute_code"


class TrustResult(Enum):
    """Trust verification results."""
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    WARNED = "warned"
    ERROR = "error"


class TrustScore:
    """Trust score details from MEEET 7-gate API."""
    
    def __init__(
        self,
        agent_did: str,
        trust_score: float,
        sara_risk: float,
        layers: Optional[Dict[str, Any]] = None,
        timestamp: Optional[str] = None
    ):
        self.agent_did = agent_did
        self.trust_score = trust_score  # 0.0 - 1.0
        self.sara_risk = sara_risk     # 0.0 - 1.0
        self.layers = layers or {}
        self.timestamp = timestamp or datetime.utcnow().isoformat() + "Z"
    
    def __repr__(self):
        return (
            f"TrustScore(did={self.agent_did}, score={self.trust_score:.2f}, "
            f"sara={self.sara_risk:.2f})"
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_did": self.agent_did,
            "trust_score": self.trust_score,
            "sara_risk": self.sara_risk,
            "layers": self.layers,
            "timestamp": self.timestamp,
        }


class MeeetGuard:
    """
    Trust verification guard for AI agent frameworks.
    
    Provides before-action hooks that verify trust scores via MEEET 7-gate API.
    Supports CrewAI, AutoGen, and LangGraph integration.
    
    Usage:
        guard = MeeetGuard(api_key="your_key", base_url="https://meeet.world/api")
        
        @guard.before_action(min_trust=0.7, sara_threshold=0.6)
        def run_task(agent):
            # Your agent logic here
            pass
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://meeet.world/api",
        default_min_trust: float = 0.5,
        default_sara_threshold: float = 0.6,
        cache_ttl_seconds: int = 300,
        log_level: int = logging.INFO,
        fail_open: bool = False,
    ):
        """
        Initialize MeeetGuard.
        
        Args:
            api_key: MEEET API key for authentication
            base_url: Base URL for MEEET API (default: https://meeet.world/api)
            default_min_trust: Default minimum trust score (0.0-1.0)
            default_sara_threshold: Default SARA risk threshold (0.0-1.0)
            cache_ttl_seconds: How long to cache trust scores (default: 5 min)
            log_level: Logging level (default: INFO)
            fail_open: If True, allow action on API error (default: False)
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_min_trust = default_min_trust
        self.default_sara_threshold = default_sara_threshold
        self.cache_ttl = timedelta(seconds=cache_ttl_seconds)
        self.fail_open = fail_open
        
        # Configure logger
        logger.setLevel(log_level)
        
        # Cache for trust scores
        self._cache: Dict[str, tuple[TrustScore, datetime]] = {}
        
        logger.info(f"🏛️ MeeetGuard initialized | base_url={base_url} | fail_open={fail_open}")
    
    def _get_cache_key(self, agent_did: str) -> str:
        """Generate cache key for agent DID."""
        return hashlib.sha256(agent_did.encode()).hexdigest()[:16]
    
    def _is_cache_valid(self, cached_time: datetime) -> bool:
        """Check if cached trust score is still valid."""
        return datetime.utcnow() - cached_time < self.cache_ttl
    
    def get_trust_score(self, agent_did: str, force_refresh: bool = False) -> TrustScore:
        """
        Get trust score for an agent from MEEET 7-gate API.
        
        Args:
            agent_did: Agent DID (did:meeet:...)
            force_refresh: Force refresh from API, skip cache
        
        Returns:
            TrustScore object with trust_score and sara_risk
        
        Raises:
            MeeetTrustError: If API call fails
        """
        cache_key = self._get_cache_key(agent_did)
        
        # Check cache
        if not force_refresh and cache_key in self._cache:
            trust_score, cached_time = self._cache[cache_key]
            if self._is_cache_valid(cached_time):
                logger.debug(f"📋 Cache hit for {agent_did[:20]}...")
                return trust_score
        
        # Call MEEET API
        url = f"{self.base_url}/trust/{agent_did}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "meeet_trust/1.0",
        }
        
        logger.info(f"🔍 Calling MEEET Trust API: {url}")
        
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read())
                
                trust_score = TrustScore(
                    agent_did=agent_did,
                    trust_score=data.get("trust_score", 0.0),
                    sara_risk=data.get("sara_risk", 0.0),
                    layers=data.get("layers", {}),
                    timestamp=data.get("timestamp"),
                )
                
                # Cache the result
                self._cache[cache_key] = (trust_score, datetime.utcnow())
                
                logger.info(
                    f"✅ Trust score fetched | {agent_did[:20]}... | "
                    f"score={trust_score.trust_score:.2f} | sara={trust_score.sara_risk:.2f}"
                )
                
                return trust_score
                
        except urllib.error.HTTPError as e:
            error_msg = f"HTTP {e.code}: {e.reason}"
            logger.error(f"❌ API error: {error_msg}")
            
            if self.fail_open:
                logger.warning(f"⚠️ fail_open=True, allowing action despite API error")
                return TrustScore(agent_did=agent_did, trust_score=1.0, sara_risk=0.0)
            
            raise MeeetTrustError(f"Failed to get trust score: {error_msg}") from e
            
        except urllib.error.URLError as e:
            error_msg = str(e.reason)
            logger.error(f"❌ Network error: {error_msg}")
            
            if self.fail_open:
                logger.warning(f"⚠️ fail_open=True, allowing action despite network error")
                return TrustScore(agent_did=agent_did, trust_score=1.0, sara_risk=0.0)
            
            raise MeeetTrustError(f"Network error: {error_msg}") from e
    
    def verify_trust(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        sara_threshold: Optional[float] = None,
        action: TrustAction = TrustAction.AGENT_TASK,
        force_refresh: bool = False,
    ) -> tuple[TrustResult, TrustScore, str]:
        """
        Verify trust score for an agent.
        
        Args:
            agent_did: Agent DID
            min_trust: Minimum trust score (uses default if not provided)
            sara_threshold: SARA risk threshold (uses default if not provided)
            action: Type of action being performed
            force_refresh: Force refresh from API
        
        Returns:
            Tuple of (TrustResult, TrustScore, reason)
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        sara_threshold = sara_threshold if sara_threshold is not None else self.default_sara_threshold
        
        logger.info(
            f"🛡️ Verifying trust | {action.value} | min_trust={min_trust} | "
            f"sara_threshold={sara_threshold}"
        )
        
        try:
            trust_score = self.get_trust_score(agent_did, force_refresh=force_refresh)
            
        except MeeetTrustError as e:
            return (
                TrustResult.ERROR,
                TrustScore(agent_did=agent_did, trust_score=0.0, sara_risk=0.0),
                str(e),
            )
        
        # Check trust score threshold
        if trust_score.trust_score < min_trust:
            reason = f"Trust score {trust_score.trust_score:.2f} < {min_trust}"
            logger.warning(f"🚫 BLOCKED: {reason}")
            return (
                TrustResult.BLOCKED,
                trust_score,
                reason,
            )
        
        # Check SARA risk threshold
        if trust_score.sara_risk > sara_threshold:
            reason = f"SARA risk {trust_score.sara_risk:.2f} > {sara_threshold}"
            if trust_score.sara_risk > 0.8:
                logger.warning(f"🚫 BLOCKED: {reason}")
                return (
                    TrustResult.BLOCKED,
                    trust_score,
                    reason,
                )
            else:
                logger.warning(f"⚠️ WARNING: {reason}")
                return (
                    TrustResult.WARNED,
                    trust_score,
                    reason,
                )
        
        reason = f"Trust verified: score={trust_score.trust_score:.2f}, sara={trust_score.sara_risk:.2f}"
        logger.info(f"✅ ALLOWED: {reason}")
        
        return (TrustResult.ALLOWED, trust_score, reason)
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        sara_threshold: Optional[float] = None,
        action: TrustAction = TrustAction.AGENT_TASK,
    ) -> Callable:
        """
        Decorator to verify trust before an agent action.
        
        Usage:
            @guard.before_action(min_trust=0.7, sara_threshold=0.6)
            def my_task(agent):
                # Only runs if trust verified
                pass
        
        Args:
            min_trust: Minimum trust score required
            sara_threshold: Maximum SARA risk allowed
            action: Type of action
        
        Returns:
            Decorator function
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(agent_or_did, *args, **kwargs):
                # Extract agent DID from various framework contexts
                agent_did = self._extract_agent_did(agent_or_did)
                
                if not agent_did:
                    logger.error(f"❌ Could not extract agent DID from: {type(agent_or_did)}")
                    raise MeeetTrustError("Cannot extract agent DID")
                
                # Verify trust
                result, trust_score, reason = self.verify_trust(
                    agent_did=agent_did,
                    min_trust=min_trust,
                    sara_threshold=sara_threshold,
                    action=action,
                )
                
                if result == TrustResult.BLOCKED:
                    logger.error(f"🚫 Action blocked: {reason}")
                    raise MeeetTrustBlocked(f"Action blocked: {reason}")
                
                if result == TrustResult.ERROR:
                    logger.error(f"❌ Trust verification error: {reason}")
                    raise MeeetTrustError(f"Trust verification failed: {reason}")
                
                # Add trust info to context for downstream use
                # Trust info available via _trust_context (not passed to func)
                
                # Execute the action
                return func(agent_or_did, *args, **kwargs)
            
            return wrapper
        return decorator
    
    def _extract_agent_did(self, agent_or_did: Any) -> Optional[str]:
        """
        Extract agent DID from various framework contexts.
        
        Supports:
        - String (assumed to be DID)
        - CrewAI Agent object
        - AutoGen agent
        - LangGraph state
        - Dict with 'agent_did' key
        """
        if agent_or_did is None:
            return None
        
        # Direct string (assume it's a DID)
        if isinstance(agent_or_did, str):
            return agent_or_did
        
        # Dict with agent_did
        if isinstance(agent_or_did, dict):
            return agent_or_did.get("agent_did") or agent_or_did.get("did")
        
        # CrewAI agent object
        if hasattr(agent_or_did, "agent_id"):
            return getattr(agent_or_did, "agent_id", None)
        if hasattr(agent_or_did, "id"):
            return getattr(agent_or_did, "id", None)
        
        # AutoGen / LangGraph style (check common attributes)
        for attr in ["agent_did", "did", "name", "id"]:
            if hasattr(agent_or_did, attr):
                value = getattr(agent_or_did, attr, None)
                if value:
                    # If it looks like a DID, return it
                    if isinstance(value, str) and (
                        value.startswith("did:") or value.startswith("agent_")
                    ):
                        return value
        
        return None
    
    def crewai_hook(self, agent, min_trust: float = 0.7, sara_threshold: float = 0.6):
        """
        CrewAI before_task hook integration.
        
        Usage in CrewAI agent config:
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            my_agent = Agent(
                name="researcher",
                role="Research Scientist",
                goal="Research scientific papers",
                backstory="Expert researcher",
                before_task_hook=lambda ctx: guard.crewai_hook(ctx, min_trust=0.7),
            )
        """
        agent_did = self._extract_agent_did(agent)
        
        if not agent_did:
            logger.warning("⚠️ No agent DID found, allowing task")
            return True
        
        result, trust_score, reason = self.verify_trust(
            agent_did=agent_did,
            min_trust=min_trust,
            sara_threshold=sara_threshold,
            action=TrustAction.AGENT_TASK,
        )
        
        if result == TrustResult.BLOCKED:
            logger.error(f"🚫 Task blocked: {reason}")
            return False
        
        logger.info(f"✅ Task allowed: {reason}")
        return True
    
    def autogen_middleware(self, agent, tool_name: str, min_trust: float = 0.7):
        """
        AutoGen agent verification middleware.
        
        Usage:
            from meeet_trust import MeeetGuard
            
            guard = MeeetGuard(api_key="your_key")
            
            # Register as AutoGen middleware
            agent.register_hook(
                hook_type="after_tool_execution",
                hook=lambda name, req: guard.autogen_middleware(agent, name, min_trust=0.7),
            )
        """
        agent_did = self._extract_agent_did(agent)
        
        if not agent_did:
            logger.warning("⚠️ No agent DID found")
            return {"error": "No agent DID"}
        
        result, trust_score, reason = self.verify_trust(
            agent_did=agent_did,
            min_trust=min_trust,
            action=TrustAction.TOOL_USE,
        )
        
        return {
            "allowed": result == TrustResult.ALLOWED,
            "trust_score": trust_score.to_dict(),
            "reason": reason,
        }
    
    def langgraph_node(
        self,
        state: dict,
        min_trust: float = 0.7,
        sara_threshold: float = 0.6,
    ) -> dict:
        """
        LangGraph node that verifies trust before proceeding.
        
        Usage:
            from meeet_trust import MeeetGuard
            from langgraph.graph import StateGraph
            
            guard = MeeetGuard(api_key="your_key")
            
            def trust_check_node(state: dict) -> dict:
                return guard.langgraph_node(state, min_trust=0.7)
            
            graph = StateGraph()
            graph.add_node("trust_check", trust_check_node)
            graph.add_edge("__start__", "trust_check")
        """
        agent_did = state.get("agent_did") or state.get("did")
        
        if not agent_did:
            logger.error("❌ No agent DID in state")
            state["trust_error"] = "No agent DID in state"
            state["trust_verified"] = False
            return state
        
        result, trust_score, reason = self.verify_trust(
            agent_did=agent_did,
            min_trust=min_trust,
            sara_threshold=sara_threshold,
        )
        
        state["trust_verified"] = result == TrustResult.ALLOWED
        state["trust_result"] = result.value
        state["trust_score"] = trust_score.to_dict()
        state["trust_reason"] = reason
        
        if result == TrustResult.BLOCKED:
            state["trust_error"] = reason
        
        return state
    
    def clear_cache(self):
        """Clear the trust score cache."""
        self._cache.clear()
        logger.info("📋 Cache cleared")
    
    def get_cached_agents(self) -> list[str]:
        """Get list of cached agent DIDs."""
        return list(self._cache.keys())


class MeeetTrustError(Exception):
    """Base exception for MeeetGuard errors."""
    pass


class MeeetTrustBlocked(MeeetTrustError):
    """Raised when an action is blocked by trust verification."""
    pass