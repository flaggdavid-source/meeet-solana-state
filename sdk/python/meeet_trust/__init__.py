"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

    from meeet_trust import MeeetGuard

    guard = MeeetGuard(api_key="your_key")

    @guard.before_action(min_trust=0.7)
    def my_agent_task():
        # Only runs if agent passes 7-gate trust check
        pass

Docs: https://meeet.world/trust-api
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

from .meeet_guard import MeeetGuard, TrustCheckError, TrustScoreTooLow, SaraRiskTooHigh, ApiError, TrustScore, TrustCheckResult
from .version import __version__

__all__ = [
    "MeeetGuard",
    "TrustCheckError", 
    "TrustScoreTooLow",
    "SaraRiskTooHigh",
    "ApiError",
    "TrustScore",
    "TrustCheckResult",
    "__version__",
]
