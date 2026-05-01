# MEEET Trust Guard - AI Agent Trust Verification for CrewAI/AutoGen/LangGraph
# 
# This package provides trust verification for AI agents using the MEEET 7-gate trust API.
# Before any agent action, it checks the trust score and SARA risk assessment.

from meeet_trust.guard import MeeetGuard, TrustResult, TrustCheckError

__all__ = ["MeeetGuard", "TrustResult", "TrustCheckError"]
__version__ = "0.1.0"