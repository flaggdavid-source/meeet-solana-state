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

from meeet_trust.guard import (
    MeeetGuard,
    TrustCheckError,
    TrustBlockedError,
    before_action,
    before_task,
)

__version__ = "0.1.0"
__all__ = [
    "MeeetGuard",
    "TrustCheckError", 
    "TrustBlockedError",
    "before_action",
    "before_task",
]
