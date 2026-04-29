"""
MEEET Trust Client - Core trust verification logic
"""

import json
import logging
import urllib.request
import urllib.error
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger("meeet_trust")


class TrustAction(Enum):
    """Types of actions that can be guarded."""
    ANY = "any"
    TASK_EXECUTE = "task_execute"
    MESSAGE_SEND = "message_send"
    TOOL_USE = "tool_use"
    MEMORY_WRITE = "memory_write"


@dataclass
class TrustScore:
    """Trust score data from MEEET 7-gate verification."""
    score: float
    level: str
    sara_risk: float
    sara_level: str
    gates_passed: int
    gates_total: int
    agent_did: str
    timestamp: Optional[str] = None
    
    def is_trusted(self, min_trust: float = 0.7) -> bool:
        """Check if trust score meets minimum threshold."""
        return self.score >= min_trust
    
    def is_sara_safe(self, max_risk: float = 0.6) -> bool:
        """Check if SARA risk is below maximum threshold."""
        return self.sara_risk <= max_risk
    
    def __bool__(self) -> bool:
        return self.is_trusted() and self.is_sara_safe()


@dataclass
class TrustCheckResult:
    """Result of a trust check."""
    allowed: bool
    trust_score: Optional[TrustScore]
    reason: str
    action: str
    
    def __bool__(self) -> bool:
        return self.allowed


class MeeetTrustException(Exception):
    """Exception raised when trust check fails."""
    pass


class MeeetTrustClient:
    """Client for MEEET Trust API."""
    
    BASE_URL = "https://meeet.world/api/trust"
    
    def __init__(self, api_key: str, timeout: int = 30):
        self.api_key = api_key
        self.timeout = timeout
        logger.info(f"Initialized MeeetTrustClient with base URL: {self.BASE_URL}")
    
    def _make_request(self, agent_did: str) -> Dict:
        """Make request to MEEET Trust API."""
        url = f"{self.BASE_URL}/{agent_did}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        logger.info(f"Checking trust for agent: {agent_did}")
        
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                data = json.loads(response.read().decode())
                logger.info(f"Trust check successful for {agent_did}: score={data.get('score')}")
                return data
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            logger.error(f"HTTP Error {e.code} for {agent_did}: {error_body}")
            raise MeeetTrustException(f"HTTP {e.code}: {error_body}")
            
        except urllib.error.URLError as e:
            logger.error(f"Network error for {agent_did}: {e.reason}")
            raise MeeetTrustException(f"Network error: {e.reason}")
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON response for {agent_did}: {e}")
            raise MeeetTrustException(f"Invalid JSON response: {e}")
    
    def get_trust_score(self, agent_did: str) -> TrustScore:
        """Get trust score for an agent."""
        data = self._make_request(agent_did)
        
        return TrustScore(
            score=data.get("score", 0.0),
            level=data.get("level", "unknown"),
            sara_risk=data.get("sara_risk", 1.0),
            sara_level=data.get("sara_level", "unknown"),
            gates_passed=data.get("gates_passed", 0),
            gates_total=data.get("gates_total", 7),
            agent_did=agent_did,
            timestamp=data.get("timestamp")
        )
    
    def verify_agent(
        self,
        agent_did: str,
        min_trust: float = 0.7,
        max_sara: float = 0.6,
        action: TrustAction = TrustAction.ANY
    ) -> TrustCheckResult:
        """Verify if an agent can perform an action."""
        logger.info(f"Verifying agent {agent_did} for action {action.value}: min_trust={min_trust}, max_sara={max_sara}")
        
        try:
            trust_score = self.get_trust_score(agent_did)
            
            # Check trust score threshold
            if not trust_score.is_trusted(min_trust):
                reason = f"Trust score {trust_score.score:.2f} below minimum {min_trust}"
                logger.warning(f"Agent {agent_did} blocked: {reason}")
                return TrustCheckResult(
                    allowed=False,
                    trust_score=trust_score,
                    reason=reason,
                    action=action.value
                )
            
            # Check SARA risk threshold
            if not trust_score.is_sara_safe(max_sara):
                reason = f"SARA risk {trust_score.sara_risk:.2f} above maximum {max_sara}"
                logger.warning(f"Agent {agent_did} blocked: {reason}")
                return TrustCheckResult(
                    allowed=False,
                    trust_score=trust_score,
                    reason=reason,
                    action=action.value
                )
            
            # All checks passed
            reason = f"Trust score {trust_score.score:.2f}, SARA risk {trust_score.sara_risk:.2f}, {trust_score.gates_passed}/{trust_score.gates_total} gates passed"
            logger.info(f"Agent {agent_did} allowed: {reason}")
            return TrustCheckResult(
                allowed=True,
                trust_score=trust_score,
                reason=reason,
                action=action.value
            )
            
        except MeeetTrustException as e:
            logger.error(f"Trust check failed for {agent_did}: {e}")
            return TrustCheckResult(
                allowed=False,
                trust_score=None,
                reason=f"Trust check error: {str(e)}",
                action=action.value
            )


class MeeetGuard:
    """Guard decorator for AI agent frameworks."""
    
    def __init__(
        self,
        api_key: str,
        min_trust: float = 0.7,
        max_sara: float = 0.6,
        default_agent_did: Optional[str] = None,
        log_level: int = logging.INFO
    ):
        logger.setLevel(log_level)
        self.client = MeeetTrustClient(api_key)
        self.min_trust = min_trust
        self.max_sara = max_sara
        self.default_agent_did = default_agent_did
        logger.info(f"Initialized MeeetGuard: min_trust={min_trust}, max_sara={max_sara}")
    
    def before_action(
        self,
        min_trust: Optional[float] = None,
        max_sara: Optional[float] = None,
        agent_did: Optional[str] = None,
        action: TrustAction = TrustAction.ANY
    ):
        """Decorator to guard agent actions with trust verification."""
        from functools import wraps
        
        min_trust = min_trust if min_trust is not None else self.min_trust
        max_sara = max_sara if max_sara is not None else self.max_sara
        agent_did = agent_did or self.default_agent_did
        
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Get agent_did from args if not provided
                did = agent_did
                if did is None:
                    if args:
                        first_arg = args[0]
                        if hasattr(first_arg, "agent_did"):
                            did = first_arg.agent_did
                        elif hasattr(first_arg, "did"):
                            did = first_arg.did
                        elif isinstance(first_arg, str) and first_arg.startswith("did:"):
                            did = first_arg
                
                if not did:
                    logger.error("No agent_did provided and could not be inferred from arguments")
                    raise MeeetTrustException("agent_did is required for trust verification")
                
                result = self.client.verify_agent(
                    agent_did=did,
                    min_trust=min_trust,
                    max_sara=max_sara,
                    action=action
                )
                
                if not result.allowed:
                    logger.warning(f"Action blocked for agent {did}: {result.reason}")
                    raise MeeetTrustException(f"Trust check failed: {result.reason}")
                
                logger.info(f"Action allowed for agent {did}")
                return func(*args, **kwargs)
            
            return wrapper
        
        return decorator
    
    def crewai_hook(self, agent_did: Optional[str] = None):
        """Create a CrewAI before_task hook."""
        did = agent_did or self.default_agent_did
        
        def hook(task):
            result = self.client.verify_agent(
                agent_did=did,
                min_trust=self.min_trust,
                max_sara=self.max_sara,
                action=TrustAction.TASK_EXECUTE
            )
            if not result.allowed:
                raise MeeetTrustException(f"Trust check failed for task: {result.reason}")
            return task
        
        return hook
    
    def autogen_middleware(self, agent_did: Optional[str] = None):
        """Create an AutoGen verification middleware."""
        did = agent_did or self.default_agent_did
        
        def middleware(agent, message):
            result = self.client.verify_agent(
                agent_did=did,
                min_trust=self.min_trust,
                max_sara=self.max_sara,
                action=TrustAction.MESSAGE_SEND
            )
            if not result.allowed:
                raise MeeetTrustException(f"Trust check failed: {result.reason}")
            return True
        
        return middleware
    
    def langgraph_node(self, agent_did: Optional[str] = None):
        """Create a LangGraph node that verifies trust."""
        did = agent_did or self.default_agent_did
        
        def node(state: dict) -> dict:
            result = self.client.verify_agent(
                agent_did=did,
                min_trust=self.min_trust,
                max_sara=self.max_sara,
                action=TrustAction.TASK_EXECUTE
            )
            if not result.allowed:
                raise MeeetTrustException(f"Trust check failed: {result.reason}")
            if result.trust_score:
                state["meeet_trust"] = {
                    "score": result.trust_score.score,
                    "sara_risk": result.trust_score.sara_risk,
                    "gates_passed": result.trust_score.gates_passed
                }
            return state
        
        return node
