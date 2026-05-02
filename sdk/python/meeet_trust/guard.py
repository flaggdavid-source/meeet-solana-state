"""
MEEET Trust Guard — Verify agent trust before action execution.

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7, max_sara=0.6)
    def my_agent_task(agent_did):
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/trust-api
"""

import logging
import os
import time
import urllib.request
import urllib.error
import json
from typing import Optional, Dict, Any, Callable
from functools import wraps

# Default configuration
DEFAULT_TIMEOUT = 30
DEFAULT_API_URL = "https://meeet.world/api"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("meeet_trust")


class TrustCheckError(Exception):
    """Raised when trust check API call fails."""
    pass


class TrustBlockedError(Exception):
    """Raised when agent fails trust check thresholds."""
    def __init__(self, message: str, trust_score: Optional[float] = None, 
                 sara_risk: Optional[float] = None, agent_did: Optional[str] = None):
        super().__init__(message)
        self.trust_score = trust_score
        self.sara_risk = sara_risk
        self.agent_did = agent_did


class MeeetGuard:
    """
    MEEET Trust Guard — Verify agent trust before action execution.
    
    Usage:
        guard = MeeetGuard(api_key="your_key")
        
        @guard.before_action(min_trust=0.7, max_sara=0.6)
        def my_task(agent_did):
            pass
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
        log_level: int = logging.INFO,
        default_min_trust: float = 0.5,
        default_max_sara: float = 0.6,
    ):
        """
        Initialize MeeetGuard.
        
        Args:
            api_key: MEEET API key (optional, can use env var MEEET_API_KEY)
            api_url: Custom API URL (defaults to meeet.world/api)
            timeout: Request timeout in seconds
            log_level: Logging level
            default_min_trust: Default minimum trust score (0.0-1.0)
            default_max_sara: Default maximum SARA risk threshold (0.0-1.0)
        """
        self.api_key = api_key or os.environ.get("MEEET_API_KEY")
        self.api_url = api_url or DEFAULT_API_URL
        self.timeout = timeout
        self.default_min_trust = default_min_trust
        self.default_max_sara = default_max_sara
        
        logger.setLevel(log_level)
        
        # Cache for trust results: {agent_did: (timestamp, result)}
        self._cache: Dict[str, tuple] = {}
        self._cache_ttl = 60  # Cache TTL in seconds
        
        logger.info(f"MeeetGuard initialized (api_url={self.api_url})")
    
    def _call_trust_api(self, agent_did: str) -> Dict[str, Any]:
        """
        Call MEEET trust API to get agent trust score and SARA risk.
        
        Args:
            agent_did: Agent DID (decentralized identifier)
            
        Returns:
            Dict with trust_score, sara_risk, and other fields
            
        Raises:
            TrustCheckError: If API call fails
        """
        url = f"{self.api_url}/trust/{agent_did}"
        
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        logger.info(f"Calling trust API: {url}")
        
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                data = json.loads(response.read().decode())
                
                logger.info(f"Trust check response: agent_did={agent_did[:16]}..., trust={data.get('trust_score')}, sara={data.get('sara_risk')}")
                return data
            
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            logger.error(f"Trust API HTTP error {e.code}: {error_body}")
            raise TrustCheckError(f"Trust API error {e.code}: {error_body}")
        except urllib.error.URLError as e:
            logger.error(f"Trust API connection error: {e.reason}")
            raise TrustCheckError(f"Connection error: {e.reason}")
        except json.JSONDecodeError as e:
            logger.error(f"Trust API invalid response: {e}")
            raise TrustCheckError(f"Invalid API response: {e}")
    
    def check_trust(
        self,
        agent_did: str,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Check if an agent passes trust thresholds.
        
        Args:
            agent_did: Agent DID to check
            min_trust: Minimum trust score threshold (0.0-1.0)
            max_sara: Maximum SARA risk threshold (0.0-1.0)
            use_cache: Whether to use cached results
            
        Returns:
            Dict with trust_score, sara_risk, passed, and details
            
        Raises:
            TrustBlockedError: If trust check fails thresholds
            TrustCheckError: If API call fails
        """
        min_trust = min_trust if min_trust is not None else self.default_min_trust
        max_sara = max_sara if max_sara is not None else self.default_max_sara
        
        # Check cache
        if use_cache and agent_did in self._cache:
            cached_time, cached_result = self._cache[agent_did]
            if time.time() - cached_time < self._cache_ttl:
                logger.debug(f"Using cached trust result for {agent_did[:16]}...")
                result = cached_result
            else:
                result = self._call_trust_api(agent_did)
                self._cache[agent_did] = (time.time(), result)
        else:
            result = self._call_trust_api(agent_did)
            self._cache[agent_did] = (time.time(), result)
        
        trust_score = result.get("trust_score", 0.0)
        sara_risk = result.get("sara_risk", 0.0)
        
        # Log the check
        logger.info(
            f"Trust check: agent={agent_did[:16]}..., "
            f"score={trust_score:.2f} (min={min_trust}), "
            f"sara={sara_risk:.2f} (max={max_sara})"
        )
        
        # Check thresholds
        passed = trust_score >= min_trust and sara_risk <= max_sara
        result["passed"] = passed
        
        if not passed:
            if trust_score < min_trust:
                logger.warning(f"BLOCKED: Trust score {trust_score:.2f} below threshold {min_trust}")
            if sara_risk > max_sara:
                logger.warning(f"BLOCKED: SARA risk {sara_risk:.2f} above threshold {max_sara}")
            
            raise TrustBlockedError(
                f"Agent {agent_did[:16]}... blocked: trust={trust_score:.2f}, sara={sara_risk:.2f}",
                trust_score=trust_score,
                sara_risk=sara_risk,
                agent_did=agent_did,
            )
        
        logger.info(f"PASSED: Agent {agent_did[:16]}... allowed to proceed")
        return result
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
        agent_did_getter: Optional[Callable] = None,
    ) -> Callable:
        """
        Decorator to verify trust before executing an agent action.
        
        Usage:
            guard = MeeetGuard(api_key="key")
            
            @guard.before_action(min_trust=0.7, max_sara=0.6)
            def my_agent_task(agent_did):
                # Only runs if trust check passes
                pass
            
            # Or with custom agent DID getter:
            @guard.before_action(agent_did_getter=lambda ctx: ctx.agent_id)
            def task_with_context(ctx):
                pass
        
        Args:
            min_trust: Minimum trust score (0.0-1.0)
            max_sara: Maximum SARA risk (0.0-1.0)
            agent_did_getter: Function to get agent_did from function args
            
        Returns:
            Decorated function
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Get agent DID
                if agent_did_getter:
                    agent_did = agent_did_getter(*args, **kwargs)
                else:
                    # Try to get from args/kwargs
                    agent_did = kwargs.get("agent_did") or kwargs.get("agent_id", None)
                    if not agent_did and args:
                        # Try first positional arg
                        agent_did = args[0] if args else None
                
                if not agent_did:
                    logger.warning("No agent_did provided, skipping trust check")
                    return func(*args, **kwargs)
                
                # Perform trust check
                self.check_trust(agent_did, min_trust, max_sara)
                
                # Execute the function
                return func(*args, **kwargs)
            
            return wrapper
        return decorator
    
    def before_task(self, min_trust: Optional[float] = None, max_sara: Optional[float] = None):
        """
        CrewAI before_task hook decorator.
        
        Usage:
            guard = MeeetGuard(api_key="key")
            
            @guard.before_task(min_trust=0.7)
            def research_task(task_input):
                # Only runs if agent passes trust check
                pass
        """
        return self.before_action(min_trust=min_trust, max_sara=max_sara)
    
    def as_langgraph_node(
        self,
        node_name: str = "meeet_trust_check",
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
    ) -> Callable:
        """
        Create a LangGraph node for trust verification.
        
        Usage:
            from langgraph.graph import StateGraph
            
            guard = MeeetGuard(api_key="key")
            
            graph = StateGraph(AgentState)
            graph.add_node("trust_check", guard.as_langgraph_node("trust", min_trust=0.7))
            graph.add_edge("__start__", "trust")
        
        Args:
            node_name: Name for this node in the graph
            min_trust: Minimum trust score
            max_sara: Maximum SARA risk
            
        Returns:
            LangGraph node function
        """
        def trust_node(state: Dict[str, Any]) -> Dict[str, Any]:
            """LangGraph node that checks trust before proceeding."""
            agent_did = state.get("agent_did") or state.get("agent_id")
            
            if not agent_did:
                logger.warning("No agent_did in state, skipping trust check")
                return state
            
            try:
                result = self.check_trust(agent_did, min_trust, max_sara)
                return {**state, "trust_passed": True, "trust_result": result}
            except TrustBlockedError as e:
                logger.error(f"Trust check failed: {e}")
                return {**state, "trust_passed": False, "trust_error": str(e)}
        
        trust_node.__name__ = node_name
        return trust_node
    
    def as_autogen_middleware(self, min_trust: Optional[float] = None, max_sara: Optional[float] = None):
        """
        Create an AutoGen middleware for agent verification.
        
        Usage:
            from autogen import ConversableAgent
            
            guard = MeeetGuard(api_key="key")
            
            agent = ConversableAgent(
                "researcher",
                system_message="You are a research agent.",
            )
            agent.register_hook(
                "message_processing",
                guard.as_autogen_middleware(min_trust=0.7)
            )
        
        Args:
            min_trust: Minimum trust score
            max_sara: Maximum SARA risk
            
        Returns:
            AutoGen middleware function
        """
        def middleware(agent, message, sender, recipient):
            """AutoGen middleware that checks trust before processing message."""
            agent_did = getattr(agent, "agent_did", None) or getattr(sender, "agent_did", None)
            
            if not agent_did:
                logger.warning("No agent_did found, allowing message")
                return message
            
            try:
                self.check_trust(agent_did, min_trust, max_sara)
                return message
            except TrustBlockedError as e:
                logger.error(f"Message blocked: {e}")
                # Return None to block the message
                return None
        
        return middleware
    
    def clear_cache(self):
        """Clear the trust check cache."""
        self._cache.clear()
        logger.info("Trust check cache cleared")


# ═══ Convenience Functions ═══

def before_action(min_trust: float = 0.5, max_sara: float = 0.6, **kwargs):
    """
    Convenience decorator using default guard instance.
    
    Usage:
        from meeet_trust import before_action
        
        @before_action(min_trust=0.7)
        def my_task(agent_did):
            pass
    """
    guard = MeeetGuard(**kwargs)
    return guard.before_action(min_trust=min_trust, max_sara=max_sara)


def before_task(min_trust: float = 0.5, max_sara: float = 0.6, **kwargs):
    """
    Convenience decorator for CrewAI before_task hook.
    
    Usage:
        from meeet_trust import before_task
        
        @before_task(min_trust=0.7)
        def research_task(task_input):
            pass
    """
    guard = MeeetGuard(**kwargs)
    return guard.before_task(min_trust=min_trust, max_sara=max_sara)


# ═══ Quick Start ═══
if __name__ == "__main__":
    print("🛡️  MEEET Trust Guard")
    print("=" * 40)
    
    # Example usage
    guard = MeeetGuard(
        api_key="demo_key",
        default_min_trust=0.7,
        default_max_sara=0.6,
    )
    
    print(f"✅ Guard initialized: {guard.api_url}")
    print(f"   Default min_trust: {guard.default_min_trust}")
    print(f"   Default max_sara: {guard.default_max_sara}")
    
    # Show decorator usage
    print("\n📝 Usage:")
    print("""
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7, max_sara=0.6)
    def my_agent_task(agent_did):
        # Only runs if agent passes 7-gate check
        pass
    """)
