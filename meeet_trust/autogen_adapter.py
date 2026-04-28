"""
MEEET Trust Adapter for AutoGen

Provides agent verification middleware that checks MEEET trust score
before any AutoGen agent executes a message or function call.

Usage:
    from meeet_trust import MeeetGuard
    from meeet_trust.adapters.autogen import MeeetAutoGenMiddleware
    
    guard = MeeetGuard(api_key="your_key")
    middleware = MeeetAutoGenMiddleware(guard, min_trust=0.7)
    
    # Use with AutoGen
    from autogen import ConversableAgent
    
    agent = ConversableAgent(
        "researcher",
        llm_config={"model": "gpt-4"},
        middleware=[middleware]  # Add middleware
    )

Docs: https://meeet.world/trust-api
"""

import logging
from typing import Optional, Callable, Any, Dict, List, Union
from functools import wraps

from . import MeeetGuard, TrustResult, TrustVerificationFailed

logger = logging.getLogger("meeet_trust.autogen")

__all__ = [
    "MeeetAutoGenMiddleware",
    "create_autogen_middleware",
    "autogen_middleware",
    "MeeetProtectedAgent",
]


class MeeetAutoGenMiddleware:
    """
    AutoGen middleware for MEEET trust verification.
    
    This middleware intercepts agent messages and function calls
    to verify trust before execution.
    """
    
    def __init__(
        self,
        guard: MeeetGuard,
        min_trust: float = 0.5,
        max_sara: float = 0.6,
        check_on: str = "message",
        agent_did_field: str = "agent_did",
    ):
        """
        Initialize the MEEET AutoGen middleware.
        
        Args:
            guard: MeeetGuard instance for trust verification
            min_trust: Minimum trust score required (0.0-1.0)
            max_sara: Maximum SARA risk allowed (0.0-1.0)
            check_on: When to check trust - "message", "function", or "both"
            agent_did_field: Field name containing agent DID
        """
        self.guard = guard
        self.min_trust = min_trust
        self.max_sara = max_sara
        self.check_on = check_on
        self.agent_did_field = agent_did_field
        
    def on_message(
        self,
        agent: Any,
        message: Any,
        sender: Any,
    ) -> Optional[Any]:
        """
        Called when an agent receives a message.
        
        Args:
            agent: The AutoGen agent
            message: The incoming message
            sender: The sender of the message
            
        Returns:
            None to continue processing, or a response to short-circuit
        """
        agent_did = self._extract_agent_did(agent)
        
        if not agent_did:
            logger.warning("Could not extract agent DID, skipping trust check")
            return None
            
        logger.info(f"AutoGen: Verifying trust for agent message")
        
        result = self.guard.verify_trust(
            agent_did=agent_did,
            min_trust=self.min_trust,
            max_sara=self.max_sara,
        )
        
        if result.blocked:
            logger.error(f"AutoGen: Message blocked - {result.message}")
            raise TrustVerificationFailed(
                f"Agent message blocked: {result.message}"
            )
        
        logger.info(f"AutoGen: Message approved - {result.message}")
        return None
        
    def on_function_call(
        self,
        agent: Any,
        function_call: Any,
    ) -> Optional[Any]:
        """
        Called when an agent makes a function call.
        
        Args:
            agent: The AutoGen agent
            function_call: The function call to verify
            
        Returns:
            None to continue processing, or a response to short-circuit
        """
        if self.check_on not in ("function", "both"):
            return None
            
        agent_did = self._extract_agent_did(agent)
        
        if not agent_did:
            logger.warning("Could not extract agent DID, skipping trust check")
            return None
            
        logger.info(f"AutoGen: Verifying trust for function call")
        
        result = self.guard.verify_trust(
            agent_did=agent_did,
            min_trust=self.min_trust,
            max_sara=self.max_sara,
        )
        
        if result.blocked:
            logger.error(f"AutoGen: Function call blocked - {result.message}")
            raise TrustVerificationFailed(
                f"Function call blocked: {result.message}"
            )
        
        logger.info(f"AutoGen: Function call approved - {result.message}")
        return None
    
    def _extract_agent_did(self, agent: Any) -> Optional[str]:
        """Extract agent DID from AutoGen agent object."""
        # Try common attribute names
        for attr in ['agent_did', 'did', 'agent_id', 'id', 'name']:
            if hasattr(agent, attr):
                value = getattr(agent, attr)
                if value and isinstance(value, str):
                    return value
                    
        # Try to get from agent config
        if hasattr(agent, 'llm_config'):
            config = agent.llm_config
            if isinstance(config, dict):
                for field in ['agent_did', 'did', 'agent_id']:
                    if field in config:
                        return config[field]
                        
        return None


def create_autogen_middleware(
    api_key: str,
    min_trust: float = 0.5,
    max_sara: float = 0.6,
    check_on: str = "message",
    **guard_kwargs,
) -> MeeetAutoGenMiddleware:
    """
    Create a MEEET AutoGen middleware.
    
    Args:
        api_key: MEEET API key
        min_trust: Minimum trust score required
        max_sara: Maximum SARA risk allowed
        check_on: When to check trust - "message", "function", or "both"
        **guard_kwargs: Additional arguments for MeeetGuard
        
    Returns:
        MeeetAutoGenMiddleware instance
        
    Example:
        from meeet_trust.adapters.autogen import create_autogen_middleware
        
        middleware = create_autogen_middleware(
            "your_api_key",
            min_trust=0.7,
            check_on="both"
        )
        
        agent = ConversableAgent(
            "researcher",
            llm_config={"model": "gpt-4"},
            middleware=[middleware]
        )
    """
    guard = MeeetGuard(api_key=api_key, **guard_kwargs)
    return MeeetAutoGenMiddleware(
        guard=guard,
        min_trust=min_trust,
        max_sara=max_sara,
        check_on=check_on,
    )


def autogen_middleware(
    api_key: str,
    min_trust: float = 0.5,
    max_sara: float = 0.6,
    check_on: str = "message",
) -> Callable:
    """
    Decorator to wrap an AutoGen agent with MEEET trust verification.
    
    Args:
        api_key: MEEET API key
        min_trust: Minimum trust score required
        max_sara: Maximum SARA risk allowed
        check_on: When to check trust
        
    Returns:
        A wrapper function
        
    Example:
        @autogen_middleware("your_api_key", min_trust=0.7)
        def create_research_agent():
            return ConversableAgent("researcher", llm_config={...})
    """
    middleware = create_autogen_middleware(
        api_key=api_key,
        min_trust=min_trust,
        max_sara=max_sara,
        check_on=check_on,
    )
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            agent = func(*args, **kwargs)
            # Attach middleware to agent
            if hasattr(agent, 'middleware'):
                agent.middleware = getattr(agent, 'middleware', []) + [middleware]
            elif hasattr(agent, 'register_middleware'):
                agent.register_middleware(middleware)
            return agent
        return wrapper
    return decorator


class MeeetProtectedAgent:
    """
    Wrapper for AutoGen agents that adds MEEET trust verification.
    
    Example:
        from autogen import ConversableAgent
        from meeet_trust.adapters.autogen import MeeetProtectedAgent
        
        base_agent = ConversableAgent("researcher", llm_config={...})
        
        protected_agent = MeeetProtectedAgent(
            base_agent,
            guard=guard,
            min_trust=0.7,
        )
    """
    
    def __init__(
        self,
        agent: Any,
        guard: MeeetGuard,
        min_trust: float = 0.5,
        max_sara: float = 0.6,
    ):
        """
        Initialize the protected agent.
        
        Args:
            agent: The underlying AutoGen agent
            guard: MeeetGuard instance
            min_trust: Minimum trust score required
            max_sara: Maximum SARA risk allowed
        """
        self._agent = agent
        self._guard = guard
        self._min_trust = min_trust
        self._max_sara = max_sara
        
    def __getattr__(self, name):
        """Proxy attribute access to underlying agent."""
        return getattr(self._agent, name)
    
    def generate_reply(
        self,
        messages: Optional[List[Dict]] = None,
        sender: Optional[Any] = None,
        **kwargs,
    ) -> Optional[Union[str, Dict]]:
        """Generate reply with trust verification."""
        # Verify trust before generating reply
        agent_did = self._extract_agent_did()
        
        if agent_did:
            result = self._guard.verify_trust(
                agent_did=agent_did,
                min_trust=self._min_trust,
                max_sara=self._max_sara,
            )
            
            if result.blocked:
                raise TrustVerificationFailed(
                    f"Agent reply blocked: {result.message}"
                )
        
        return self._agent.generate_reply(messages, sender, **kwargs)
    
    def _extract_agent_did(self) -> Optional[str]:
        """Extract agent DID from wrapped agent."""
        for attr in ['agent_did', 'did', 'agent_id', 'id', 'name']:
            if hasattr(self._agent, attr):
                value = getattr(self._agent, attr)
                if value and isinstance(value, str):
                    return value
        return None


# AutoGen 0.2+ compatible hook system
class MeeetAutoGenHook:
    """
    AutoGen 0.2+ compatible hook for MEEET trust verification.
    
    This implements the newer AutoGen hook interface.
    """
    
    def __init__(
        self,
        guard: MeeetGuard,
        min_trust: float = 0.5,
        max_sara: float = 0.6,
    ):
        self.guard = guard
        self.min_trust = min_trust
        self.max_sara = max_sara
        
    async def on_pre_message_process(self, agent: Any, message: Any, context: Any) -> Any:
        """Called before message processing."""
        agent_did = self._extract_agent_did(agent)
        
        if not agent_did:
            return message
            
        result = self.guard.verify_trust(
            agent_did=agent_did,
            min_trust=self.min_trust,
            max_sara=self.max_sara,
        )
        
        if result.blocked:
            raise TrustVerificationFailed(
                f"Message blocked: {result.message}"
            )
            
        return message
        
    def _extract_agent_did(self, agent: Any) -> Optional[str]:
        """Extract agent DID."""
        for attr in ['agent_did', 'did', 'agent_id', 'id', 'name']:
            if hasattr(agent, attr):
                value = getattr(agent, attr)
                if value and isinstance(value, str):
                    return value
        return None
