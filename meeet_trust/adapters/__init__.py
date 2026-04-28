"""
MEEET Trust Adapters for AI Agent Frameworks

This package provides adapters for:
- CrewAI: before_task hook that checks MEEET trust score
- AutoGen: agent verification middleware
- LangGraph: node that calls MEEET 7-gate trust API
"""

from .. import MeeetGuard, TrustResult, TrustVerificationFailed, MeeetTrustError

# CrewAI adapter
from ..crewai_adapter import (
    MeeetCrewAIHook,
    create_meeet_task_hook,
    crewai_before_task,
    MeeetProtectedTask,
)

# AutoGen adapter
from ..autogen_adapter import (
    MeeetAutoGenMiddleware,
    create_autogen_middleware,
    autogen_middleware,
    MeeetProtectedAgent,
    MeeetAutoGenHook,
)

# LangGraph adapter
from ..langgraph_adapter import (
    create_trust_node,
    MeeetTrustNode,
    trust_condition,
    MeeetTrustableNode,
    create_trust_workflow,
    TrustCheckResult,
)

__all__ = [
    # Base classes
    "MeeetGuard",
    "TrustResult",
    "MeeetTrustError",
    "TrustVerificationFailed",
    # CrewAI
    "MeeetCrewAIHook",
    "create_meeet_task_hook",
    "crewai_before_task",
    "MeeetProtectedTask",
    # AutoGen
    "MeeetAutoGenMiddleware",
    "create_autogen_middleware",
    "autogen_middleware",
    "MeeetProtectedAgent",
    "MeeetAutoGenHook",
    # LangGraph
    "create_trust_node",
    "MeeetTrustNode",
    "trust_condition",
    "MeeetTrustableNode",
    "create_trust_workflow",
    "TrustCheckResult",
]
