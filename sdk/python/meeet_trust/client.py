"""
MEEET Trust API Client

Handles HTTP communication with MEEET trust verification endpoints.
"""

import json
import logging
import urllib.request
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Trust API endpoints
TRUST_API_BASE = "https://meeet.world/api/trust"


@dataclass
class TrustScore:
    """MEEET trust score response."""
    agent_did: str
    score: float  # 0.0 - 1.0
    level: str  # L1-L6
    sara_risk: float  # 0.0 - 1.0
    reputation: int
    stake: int
    verified: bool
    gates_passed: Dict[str, bool]
    timestamp: str


class MeeetTrustClient:
    """Client for MEEET Trust API."""
    
    def __init__(self, api_key: str, base_url: str = TRUST_API_BASE):
        self.api_key = api_key
        self.base_url = base_url
    
    def _request(self, method: str, endpoint: str, data: Optional[dict] = None) -> dict:
        """Make HTTP request to MEEET API."""
        url = f"{self.base_url}/{endpoint}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        if data:
            body = json.dumps(data).encode()
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
        else:
            req = urllib.request.Request(url, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            logger.error(f"HTTP {e.code}: {error_body}")
            raise MeeetAPIError(f"HTTP {e.code}: {error_body}") from e
        except urllib.error.URLError as e:
            logger.error(f"Network error: {e.reason}")
            raise MeeetAPIError(f"Network error: {e.reason}") from e
    
    def get_trust_score(self, agent_did: str) -> TrustScore:
        """
        Get trust score for an agent.
        
        Args:
            agent_did: Agent DID (e.g., "did:meeet:agent123")
        
        Returns:
            TrustScore with trust level, SARA risk, and gate status
        """
        logger.info(f"Fetching trust score for {agent_did}")
        
        try:
            # Try the trust endpoint
            response = self._request("GET", f"score/{agent_did}")
        except MeeetAPIError:
            # Fallback: try without "score/" prefix
            response = self._request("GET", f"{agent_did}")
        
        return TrustScore(
            agent_did=response.get("agent_did", agent_did),
            score=response.get("score", 0.0),
            level=response.get("level", "L0"),
            sara_risk=response.get("sara_risk", 0.0),
            reputation=response.get("reputation", 0),
            stake=response.get("stake", 0),
            verified=response.get("verified", False),
            gates_passed=response.get("gates_passed", {}),
            timestamp=response.get("timestamp", ""),
        )
    
    def verify_agent(self, agent_did: str) -> Dict[str, Any]:
        """
        Verify an agent against the 7-gate trust system.
        
        Returns:
            Dict with verification result and details
        """
        logger.info(f"Verifying agent {agent_did}")
        
        response = self._request("POST", "verify", {"agent_did": agent_did})
        
        return {
            "verified": response.get("verified", False),
            "trust_score": response.get("trust_score", 0.0),
            "sara_risk": response.get("sara_risk", 0.0),
            "gates_passed": response.get("gates_passed", {}),
            "reason": response.get("reason", ""),
        }
    
    def check_trust(self, agent_did: str, min_trust: float = 0.5, 
                    max_sara_risk: float = 0.6) -> Dict[str, Any]:
        """
        Check if agent meets trust requirements.
        
        Args:
            agent_did: Agent DID
            min_trust: Minimum trust score (0.0-1.0)
            max_sara_risk: Maximum SARA risk threshold (0.0-1.0)
        
        Returns:
            Dict with check result and details
        """
        trust_score = self.get_trust_score(agent_did)
        
        result = {
            "agent_did": agent_did,
            "trust_score": trust_score.score,
            "sara_risk": trust_score.sara_risk,
            "level": trust_score.level,
            "passed": trust_score.score >= min_trust and trust_score.sara_risk <= max_sara_risk,
            "gates_passed": trust_score.gates_passed,
        }
        
        logger.info(f"Trust check for {agent_did}: score={trust_score.score}, "
                   f"sara_risk={trust_score.sara_risk}, passed={result['passed']}")
        
        return result


class MeeetAPIError(Exception):
    """MEEET API error."""
    pass
