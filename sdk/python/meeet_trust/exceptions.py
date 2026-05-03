"""
MEEET Trust exceptions.
"""

class TrustVerificationError(Exception):
    """Base exception for trust verification errors."""
    pass


class TrustScoreTooLow(TrustVerificationError):
    """Raised when agent's trust score is below threshold."""
    
    def __init__(self, agent_did: str, trust_score: float, min_trust: float):
        self.agent_did = agent_did
        self.trust_score = trust_score
        self.min_trust = min_trust
        super().__init__(
            f"Trust score {trust_score:.2f} for agent {agent_did} is below "
            f"minimum threshold {min_trust}"
        )


class SARARiskTooHigh(TrustVerificationError):
    """Raised when agent's SARA risk is above threshold."""
    
    def __init__(self, agent_did: str, sara_risk: float, max_sara_risk: float):
        self.agent_did = agent_did
        self.sara_risk = sara_risk
        self.max_sara_risk = max_sara_risk
        super().__init__(
            f"SARA risk {sara_risk:.2f} for agent {agent_did} exceeds "
            f"maximum threshold {max_sara_risk}"
        )


class AgentNotVerified(TrustVerificationError):
    """Raised when agent is not verified in MEEET system."""
    
    def __init__(self, agent_did: str):
        self.agent_did = agent_did
        super().__init__(f"Agent {agent_did} is not verified in MEEET system")


class APIClientError(TrustVerificationError):
    """Raised when API client encounters an error."""
    pass
