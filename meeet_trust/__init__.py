"""
MEEET Trust Guard - AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

Connect your AI agent framework to MEEET trust verification before any action executes.

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task():
        # Only runs if agent passes 7-gate check
        pass
"""

from .client import (
    MeeetGuard,
    MeeetTrustClient,
    TrustScore,
    TrustCheckResult,
    TrustAction,
    MeeetTrustException,
)

__version__ = "0.1.0"
__all__ = [
    "MeeetGuard",
    "MeeetTrustClient",
    "TrustScore",
    "TrustCheckResult",
    "TrustAction",
    "MeeetTrustException",
]
