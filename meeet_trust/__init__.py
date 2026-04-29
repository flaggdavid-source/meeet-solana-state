"""
MEEET Trust Guard — AI Agent Trust Verification

Connect your AI agents to MEEET 7-gate trust verification.
Blocks actions from untrusted agents based on trust score and SARA risk.

    from meeet_trust import MeeetGuard

    guard = MeeetGuard(api_key="your_key")

    @guard.before_action(min_trust=0.7)
    def my_agent_task():
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/trust-api
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

from meeet_trust.meeet_guard import (
    MeeetGuard,
    TrustResult,
    MeeetTrustError,
    TrustCheckFailedError,
    MeeetAPIError,
    check_agent_trust,
)

__version__ = "0.1.0"
__all__ = [
    "MeeetGuard",
    "TrustResult",
    "MeeetTrustError",
    "TrustCheckFailedError",
    "MeeetAPIError",
    "check_agent_trust",
]