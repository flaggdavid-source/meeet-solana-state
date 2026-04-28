"""
MEEET Trust Adapter for CrewAI

Provides a before_task hook that checks MEEET trust score before any CrewAI task executes.

Usage:
    from meeet_trust import MeeetGuard
    from meeet_trust.adapters.crewai import create_meeet_task_hook
    
    guard = MeeetGuard(api_key="your_key")
    meeet_task_hook = create_meeet_task_hook(guard, min_trust=0.7)
    
    # Use with CrewAI
    from crewai import Task, Agent
    
    task = Task(
        description="Research task",
        agent=agent,
        hooks=[meeet_task_hook]  # Add the hook here
    )

Docs: https://meeet.world/trust-api
"""

import logging
from typing import Optional, Callable, Any, Dict
from functools import wraps

from . import MeeetGuard, TrustResult, TrustVerificationFailed

logger = logging.getLogger("meeet_trust.crewai")

__all__ = ["create_meeet_task_hook", "MeeetCrewAIHook", "crewai_before_task"]


class MeeetCrewAIHook:
    """
    CrewAI hook that verifies agent trust before task execution.
    
    This hook implements CrewAI's hook system to check MEEET trust
    scores before any task is executed.
    """
    
    def __init__(
        self,
        guard: MeeetGuard,
        min_trust: float = 0.5,
        max_sara: float = 0.6,
        agent_did_field: str = "agent_did",
    ):
        """
        Initialize the MEEET CrewAI hook.
        
        Args:
            guard: MeeetGuard instance for trust verification
            min_trust: Minimum trust score required (0.0-1.0)
            max_sara: Maximum SARA risk allowed (0.0-1.0)
            agent_did_field: Field name containing agent DID in task context
        """
        self.guard = guard
        self.min_trust = min_trust
        self.max_sara = max_sara
        self.agent_did_field = agent_did_field
        
    def before_task(self, task: Any) -> None:
        """
        Called before a CrewAI task executes.
        
        Args:
            task: The CrewAI Task object
            
        Raises:
            TrustVerificationFailed: If trust verification fails
        """
        # Extract agent DID from task
        agent_did = self._extract_agent_did(task)
        
        if not agent_did:
            logger.warning("Could not extract agent DID from task, skipping trust check")
            return
            
        logger.info(f"CrewAI: Verifying trust for task '{task.description[:50]}...'")
        
        result = self.guard.verify_trust(
            agent_did=agent_did,
            min_trust=self.min_trust,
            max_sara=self.max_sara,
        )
        
        if result.blocked:
            logger.error(f"CrewAI: Task blocked - {result.message}")
            raise TrustVerificationFailed(
                f"Task '{task.description[:50]}...' blocked: {result.message}"
            )
        
        logger.info(f"CrewAI: Task approved - {result.message}")
        
    def _extract_agent_did(self, task: Any) -> Optional[str]:
        """Extract agent DID from task object."""
        # Try to get from task.agent
        if hasattr(task, 'agent') and task.agent:
            if hasattr(task.agent, 'agent_did'):
                return task.agent.agent_did
            if hasattr(task.agent, 'did'):
                return task.agent.did
            if hasattr(task.agent, 'id'):
                return task.agent.id
                
        # Try to get from task context
        if hasattr(task, 'context') and task.context:
            if isinstance(task.context, dict):
                return task.context.get(self.agent_did_field)
                
        # Try to get from task attributes
        if hasattr(task, 'agent_did'):
            return task.agent_did
            
        return None


def create_meeet_task_hook(
    guard: MeeetGuard,
    min_trust: float = 0.5,
    max_sara: float = 0.6,
    agent_did_field: str = "agent_did",
) -> MeeetCrewAIHook:
    """
    Create a MEEET task hook for CrewAI.
    
    Args:
        guard: MeeetGuard instance
        min_trust: Minimum trust score required
        max_sara: Maximum SARA risk allowed
        agent_did_field: Field name for agent DID
        
    Returns:
        MeeetCrewAIHook instance
        
    Example:
        from meeet_trust import MeeetGuard
        from meeet_trust.adapters.crewai import create_meeet_task_hook
        
        guard = MeeetGuard(api_key="your_key")
        meeet_hook = create_meeet_task_hook(guard, min_trust=0.7)
        
        # Use in CrewAI task
        task = Task(
            description="Analyze research papers",
            agent=researcher,
            hooks=[meeet_hook]
        )
    """
    return MeeetCrewAIHook(
        guard=guard,
        min_trust=min_trust,
        max_sara=max_sara,
        agent_did_field=agent_did_field,
    )


def crewai_before_task(
    api_key: str,
    min_trust: float = 0.5,
    max_sara: float = 0.6,
    **guard_kwargs,
) -> Callable:
    """
    Decorator-style function to create a before_task hook.
    
    Args:
        api_key: MEEET API key
        min_trust: Minimum trust score required
        max_sara: Maximum SARA risk allowed
        **guard_kwargs: Additional arguments for MeeetGuard
        
    Returns:
        A hook function compatible with CrewAI
        
    Example:
        before_task = crewai_before_task("your_api_key", min_trust=0.7)
        
        task = Task(
            description="Research task",
            hooks=[before_task]
        )
    """
    guard = MeeetGuard(api_key=api_key, **guard_kwargs)
    return create_meeet_task_hook(guard, min_trust, max_sara)


# Integration with CrewAI's Task class via subclassing
class MeeetProtectedTask:
    """
    A CrewAI Task wrapper that automatically applies MEEET trust verification.
    
    Example:
        from crewai import Agent
        from meeet_trust.adapters.crewai import MeeetProtectedTask
        
        agent = Agent(role="Researcher", ...)
        
        task = MeeetProtectedTask(
            description="Research AI safety",
            agent=agent,
            guard=guard,
            min_trust=0.7,
        )
    """
    
    def __init__(
        self,
        description: str,
        agent: Any,
        guard: MeeetGuard,
        expected_output: str = "",
        min_trust: float = 0.5,
        max_sara: float = 0.6,
        **task_kwargs,
    ):
        # Import here to avoid hard dependency
        try:
            from crewai import Task
        except ImportError:
            raise ImportError("CrewAI is required. Install with: pip install crewai")
        
        self._guard = guard
        self._min_trust = min_trust
        self._max_sara = max_sara
        
        # Create the underlying CrewAI task
        self._task = Task(
            description=description,
            agent=agent,
            expected_output=expected_output,
            **task_kwargs,
        )
        
    def __getattr__(self, name):
        """Proxy attribute access to underlying task."""
        return getattr(self._task, name)
    
    def execute(self, *args, **kwargs):
        """Execute the task with trust verification."""
        # Verify trust before execution
        agent_did = self._extract_agent_did()
        
        if agent_did:
            result = self._guard.verify_trust(
                agent_did=agent_did,
                min_trust=self._min_trust,
                max_sara=self._max_sara,
            )
            
            if result.blocked:
                raise TrustVerificationFailed(
                    f"Task blocked: {result.message}"
                )
        
        return self._task.execute(*args, **kwargs)
    
    def _extract_agent_did(self):
        """Extract agent DID from the wrapped task."""
        if hasattr(self._task, 'agent') and self._task.agent:
            if hasattr(self._task.agent, 'agent_did'):
                return self._task.agent.agent_did
            if hasattr(self._task.agent, 'did'):
                return self._task.agent.did
        return None
