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
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

from .meeet_guard import MeeetGuard, TrustCheckError, TrustScoreTooLow, SARARiskTooHigh
from .client import MeeetTrustClient

__version__ = "0.1.0"
__all__ = ["MeeetGuard", "TrustCheckError", "TrustScoreTooLow", "SARARiskTooHigh", "MeeetTrustClient"]
