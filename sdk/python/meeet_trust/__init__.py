"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

Before any agent action → call meeet.world/api/trust/{agentDid}
If trust score < threshold → block action
If SARA risk > 0.6 → warn or block
Logging of all trust checks

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task():
        # Only runs if agent passes 7-gate check
        pass
"""

from meeet_trust.guard import MeeetGuard
from meeet_trust.client import MeeetTrustClient
from meeet_trust.exceptions import TrustVerificationError, TrustScoreTooLow, SARARiskTooHigh

__version__ = "0.1.0"
__all__ = [
    "MeeetGuard",
    "MeeetTrustClient", 
    "TrustVerificationError",
    "TrustScoreTooLow",
    "SARARiskTooHigh",
]
