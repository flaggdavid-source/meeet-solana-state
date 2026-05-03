"""
MEEET Trust API Client

Calls meeet.world/api/trust/{agentDid} to verify agent trust score
and SARA risk assessment.
"""

import json
import logging
import urllib.request
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Trust API endpoint
TRUST_API_BASE = "https://meeet.world/api/trust"


@dataclass
class TrustScore:
    """Trust score response from MEEET API."""
    agent_did: str
    trust_score: float  # 0.0 - 1.0
    sara_risk: float    # 0.0 - 1.0
    gates_passed: int   # 1-7 gates
    gates_total: int    # Usually 7
    reputation: int
    stake_amount: float
    verified: bool
    raw_response: Dict[str, Any]


class MeeetTrustClient:
    """Client for MEEET Trust API."""
    
    def __init__(self, api_key: str, base_url: str = TRUST_API_BASE):
        """
        Initialize MEEET Trust client.
        
        Args:
            api_key: Your MEEET API key
            base_url: Trust API base URL (default: https://meeet.world/api/trust)
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
    
    def _make_request(self, agent_did: str) -> Dict[str, Any]:
        """Make request to MEEET Trust API."""
        url = f"{self.base_url}/{agent_did}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        logger.debug(f"Calling MEEET Trust API: {url}")
        
        req = urllib.request.Request(url, headers=headers, method="GET")
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
                logger.info(f"Trust API response for {agent_did}: score={data.get('trust_score')}, sara={data.get('sara_risk')}")
                return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                logger.warning(f"Agent not found in MEEET: {agent_did}")
                return {
                    "agent_did": agent_did,
                    "trust_score": 0.0,
                    "sara_risk": 1.0,
                    "gates_passed": 0,
                    "gates_total": 7,
                    "reputation": 0,
                    "stake_amount": 0.0,
                    "verified": False,
                    "error": "Agent not found"
                }
            elif e.code == 401:
                logger.error("Invalid API key")
                raise Exception("Invalid MEEET API key")
            else:
                logger.error(f"HTTP error: {e.code} - {e.reason}")
                raise
        except Exception as e:
            logger.error(f"Trust API error: {e}")
            raise
    
    def get_trust_score(self, agent_did: str) -> TrustScore:
        """
        Get trust score for an agent.
        
        Args:
            agent_did: Agent's DID (e.g., "did:meeet:agent123")
            
        Returns:
            TrustScore object with trust and SARA risk data
        """
        data = self._make_request(agent_did)
        
        return TrustScore(
            agent_did=data.get("agent_did", agent_did),
            trust_score=float(data.get("trust_score", 0.0)),
            sara_risk=float(data.get("sara_risk", 0.0)),
            gates_passed=int(data.get("gates_passed", 0)),
            gates_total=int(data.get("gates_total", 7)),
            reputation=int(data.get("reputation", 0)),
            stake_amount=float(data.get("stake_amount", 0.0)),
            verified=bool(data.get("verified", False)),
            raw_response=data
        )
    
    def verify_agent(
        self, 
        agent_did: str, 
        min_trust: float = 0.5,
        max_sara_risk: float = 0.6
    ) -> tuple[bool, TrustScore]:
        """
        Verify an agent passes trust and risk thresholds.
        
        Args:
            agent_did: Agent's DID
            min_trust: Minimum trust score (0.0-1.0)
            max_sara_risk: Maximum SARA risk (0.0-1.0)
            
        Returns:
            Tuple of (is_verified, TrustScore)
        """
        trust_score = self.get_trust_score(agent_did)
        
        is_verified = (
            trust_score.trust_score >= min_trust and
            trust_score.sara_risk <= max_sara_risk and
            trust_score.verified
        )
        
        logger.info(
            f"Verification for {agent_did}: "
            f"trust={trust_score.trust_score:.2f} (min={min_trust}), "
            f"sara={trust_score.sara_risk:.2f} (max={max_sara_risk}), "
            f"gates={trust_score.gates_passed}/{trust_score.gates_total}, "
            f"verified={is_verified}"
        )
        
        return is_verified, trust_score
