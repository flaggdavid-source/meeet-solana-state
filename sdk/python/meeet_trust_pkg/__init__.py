"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task(agent_did):
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/trust-api
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

from meeet_trust import (
    MeeetGuard,
    MeeetTrustError,
    TrustCheckFailedError,
    check_trust,
    DEFAULT_MIN_TRUST,
    DEFAULT_SARA_THRESHOLD,
    DEFAULT_TRUST_API_URL,
)

__version__ = "0.1.0"
__all__ = [
    "MeeetGuard",
    "MeeetTrustError",
    "TrustCheckFailedError",
    "check_trust",
    "DEFAULT_MIN_TRUST",
    "DEFAULT_SARA_THRESHOLD",
    "DEFAULT_TRUST_API_URL",
]
