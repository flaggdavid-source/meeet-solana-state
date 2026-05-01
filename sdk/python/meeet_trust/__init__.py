"""
MEEET Trust Guard — AI Agent Trust Verification for CrewAI, AutoGen, and LangGraph

This module provides trust verification for AI agents before they can perform actions.
It checks the MEEET trust score and SARA risk assessment.

Usage:
    from meeet_trust import MeeetGuard
    
    guard = MeeetGuard(api_key="your_key")
    
    @guard.before_action(min_trust=0.7)
    def my_agent_task(agent_did: str, task_data: dict):
        # Only runs if agent passes 7-gate check
        pass

Docs: https://meeet.world/developer
GitHub: https://github.com/alxvasilevvv/meeet-solana-state
"""

from meeet_trust.guard import (
    MeeetGuard,
    TrustVerificationError,
    TrustScoreTooLow,
    SaraRiskTooHigh,
    TrustResponse,
)

__all__ = [
    "MeeetGuard",
    "TrustVerificationError",
    "TrustScoreTooLow",
    "SaraRiskTooHigh",
    "TrustResponse",
]

__version__ = "0.1.0"
