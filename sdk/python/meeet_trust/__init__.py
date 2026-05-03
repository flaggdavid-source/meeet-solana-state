"""
MEEET Trust Guard — AI Agent Trust Verification Adapter

Connect MEEET trust verification to popular AI agent frameworks:
- CrewAI (before_task hook)
- AutoGen (agent verification middleware)
- LangGraph (node that calls MEEET 7-gate trust API)

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task():
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/developer
Trust API: https://meeet.world/trust-api
"""

from .guard import MeeetGuard
from .exceptions import TrustVerificationError, TrustScoreTooLow, SARARiskTooHigh

__version__ = "0.1.0"
__all__ = ["MeeetGuard", "TrustVerificationError", "TrustScoreTooLow", "SARARiskTooHigh"]
