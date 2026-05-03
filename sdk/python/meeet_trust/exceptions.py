"""
MEEET Trust Guard — Custom Exceptions
"""


class TrustVerificationError(Exception):
    """Base exception for trust verification errors."""
    
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class TrustScoreTooLow(TrustVerificationError):
    """Raised when agent trust score is below the minimum threshold."""
    
    def __init__(self, message: str, score: float, threshold: float):
        super().__init__(message)
        self.score = score
        self.threshold = threshold


class SARARiskTooHigh(TrustVerificationError):
    """Raised when agent SARA risk exceeds the maximum threshold."""
    
    def __init__(self, message: str, risk: float, threshold: float):
        super().__init__(message)
        self.risk = risk
        self.threshold = threshold
