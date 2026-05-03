"""
Unit tests for MeeetTrustClient.
"""

import pytest
from unittest.mock import Mock, patch, mock_open
import json
from meeet_trust.client import MeeetTrustClient, TrustScore


class TestMeeetTrustClient:
    """Tests for MeeetTrustClient class."""
    
    def test_init(self):
        """Test client initialization."""
        client = MeeetTrustClient(api_key="test_key")
        assert client.api_key == "test_key"
        assert client.base_url == "https://meeet.world/api/trust"
    
    def test_init_custom_base_url(self):
        """Test client with custom base URL."""
        client = MeeetTrustClient(
            api_key="test_key",
            base_url="https://custom.api/trust"
        )
        assert client.base_url == "https://custom.api/trust"
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_get_trust_score_success(self, mock_urlopen):
        """Test successful trust score retrieval."""
        mock_response = Mock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.85,
            "sara_risk": 0.3,
            "gates_passed": 7,
            "gates_total": 7,
            "reputation": 1000,
            "stake_amount": 100.0,
            "verified": True,
        }).encode()
        mock_urlopen.return_value.__enter__ = Mock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = Mock(return_value=False)
        
        client = MeeetTrustClient(api_key="test_key")
        result = client.get_trust_score("did:meeet:agent123")
        
        assert isinstance(result, TrustScore)
        assert result.agent_did == "did:meeet:agent123"
        assert result.trust_score == 0.85
        assert result.sara_risk == 0.3
        assert result.gates_passed == 7
        assert result.gates_total == 7
        assert result.reputation == 1000
        assert result.stake_amount == 100.0
        assert result.verified is True
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_verify_agent_passes(self, mock_urlopen):
        """Test verify_agent when agent passes."""
        mock_response = Mock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.85,
            "sara_risk": 0.3,
            "gates_passed": 7,
            "gates_total": 7,
            "reputation": 1000,
            "stake_amount": 100.0,
            "verified": True,
        }).encode()
        mock_urlopen.return_value.__enter__ = Mock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = Mock(return_value=False)
        
        client = MeeetTrustClient(api_key="test_key")
        is_verified, trust_score = client.verify_agent(
            "did:meeet:agent123",
            min_trust=0.7,
            max_sara_risk=0.6
        )
        
        assert is_verified is True
        assert trust_score.trust_score == 0.85
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_verify_agent_fails_low_trust(self, mock_urlopen):
        """Test verify_agent fails on low trust."""
        mock_response = Mock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent456",
            "trust_score": 0.3,
            "sara_risk": 0.2,
            "gates_passed": 3,
            "gates_total": 7,
            "reputation": 100,
            "stake_amount": 10.0,
            "verified": True,
        }).encode()
        mock_urlopen.return_value.__enter__ = Mock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = Mock(return_value=False)
        
        client = MeeetTrustClient(api_key="test_key")
        is_verified, trust_score = client.verify_agent(
            "did:meeet:agent456",
            min_trust=0.7,
            max_sara_risk=0.6
        )
        
        assert is_verified is False
        assert trust_score.trust_score == 0.3
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_verify_agent_fails_high_risk(self, mock_urlopen):
        """Test verify_agent fails on high SARA risk."""
        mock_response = Mock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent789",
            "trust_score": 0.8,
            "sara_risk": 0.8,
            "gates_passed": 5,
            "gates_total": 7,
            "reputation": 500,
            "stake_amount": 50.0,
            "verified": True,
        }).encode()
        mock_urlopen.return_value.__enter__ = Mock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = Mock(return_value=False)
        
        client = MeeetTrustClient(api_key="test_key")
        is_verified, trust_score = client.verify_agent(
            "did:meeet:agent789",
            min_trust=0.7,
            max_sara_risk=0.6
        )
        
        assert is_verified is False
        assert trust_score.sara_risk == 0.8
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_verify_agent_fails_unverified(self, mock_urlopen):
        """Test verify_agent fails when agent not verified."""
        mock_response = Mock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent000",
            "trust_score": 0.6,
            "sara_risk": 0.4,
            "gates_passed": 4,
            "gates_total": 7,
            "reputation": 200,
            "stake_amount": 20.0,
            "verified": False,
        }).encode()
        mock_urlopen.return_value.__enter__ = Mock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = Mock(return_value=False)
        
        client = MeeetTrustClient(api_key="test_key")
        is_verified, trust_score = client.verify_agent(
            "did:meeet:agent000",
            min_trust=0.5,
            max_sara_risk=0.6
        )
        
        assert is_verified is False
        assert trust_score.verified is False
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_http_error_404(self, mock_urlopen):
        """Test handling of 404 error."""
        import urllib.error
        
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="",
            code=404,
            msg="Not Found",
            hdrs={},
            fp=None
        )
        
        client = MeeetTrustClient(api_key="test_key")
        result = client.get_trust_score("did:meeet:unknown")
        
        # Should return default values for unknown agent
        assert result.trust_score == 0.0
        assert result.sara_risk == 1.0
        assert result.verified is False
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_http_error_401(self, mock_urlopen):
        """Test handling of 401 error."""
        import urllib.error
        
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=None
        )
        
        client = MeeetTrustClient(api_key="invalid_key")
        
        with pytest.raises(Exception) as exc_info:
            client.get_trust_score("did:meeet:agent123")
        
        assert "Invalid MEEET API key" in str(exc_info.value)


class TestTrustScore:
    """Tests for TrustScore dataclass."""
    
    def test_trust_score_creation(self):
        """Test TrustScore creation."""
        score = TrustScore(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.3,
            gates_passed=7,
            gates_total=7,
            reputation=1000,
            stake_amount=100.0,
            verified=True,
            raw_response={"test": "data"}
        )
        
        assert score.agent_did == "did:meeet:agent123"
        assert score.trust_score == 0.85
        assert score.sara_risk == 0.3
        assert score.gates_passed == 7
        assert score.gates_total == 7
        assert score.reputation == 1000
        assert score.stake_amount == 100.0
        assert score.verified is True
        assert score.raw_response == {"test": "data"}
    
    def test_trust_score_defaults(self):
        """Test TrustScore default values."""
        score = TrustScore(
            agent_did="did:meeet:agent123",
            trust_score=0.5,
            sara_risk=0.5,
            gates_passed=0,
            gates_total=7,
            reputation=0,
            stake_amount=0.0,
            verified=False,
            raw_response={}
        )
        
        assert score.trust_score == 0.5
        assert score.verified is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
