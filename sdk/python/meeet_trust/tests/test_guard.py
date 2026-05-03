"""
Tests for MEEET Trust Guard
"""

import json
import unittest
from unittest.mock import patch, MagicMock
from io import BytesIO

import pytest

from meeet_trust import MeeetGuard
from meeet_trust.guard import MeeetTrustResponse
from meeet_trust.exceptions import (
    TrustVerificationError,
    TrustScoreTooLow,
    SARARiskTooHigh,
)


# Sample API responses for testing
MOCK_TRUST_RESPONSE = {
    "agent_did": "did:meeet:agent_0x7a3f",
    "combined_trust_score": 0.84,
    "gates": {
        "identity": "verified",
        "authority": "level_2",
        "wallet_state": "bound",
        "risk_assessment": 0.23,
        "verification_accuracy": 0.87,
        "behavioral_trust": 0.81,
        "economic_accountability": "clean",
    },
}

MOCK_LOW_TRUST_RESPONSE = {
    "agent_did": "did:meeet:agent_0x1234",
    "combined_trust_score": 0.45,
    "gates": {
        "identity": "verified",
        "authority": "level_1",
        "wallet_state": "bound",
        "risk_assessment": 0.15,
        "verification_accuracy": 0.50,
        "behavioral_trust": 0.40,
        "economic_accountability": "clean",
    },
}

MOCK_HIGH_RISK_RESPONSE = {
    "agent_did": "did:meeet:agent_0x5678",
    "combined_trust_score": 0.75,
    "gates": {
        "identity": "verified",
        "authority": "level_2",
        "wallet_state": "bound",
        "risk_assessment": 0.75,  # High SARA risk
        "verification_accuracy": 0.70,
        "behavioral_trust": 0.65,
        "economic_accountability": "clean",
    },
}


class TestMeeetTrustResponse:
    """Tests for MeeetTrustResponse class."""
    
    def test_parse_response(self):
        """Test parsing of trust API response."""
        response = MeeetTrustResponse(MOCK_TRUST_RESPONSE)
        
        assert response.agent_did == "did:meeet:agent_0x7a3f"
        assert response.combined_trust_score == 0.84
        assert response.sara_risk == 0.23
        assert response.identity == "verified"
        assert response.authority == "level_2"
        assert response.wallet_state == "bound"
        assert response.verification_accuracy == 0.87
        assert response.behavioral_trust == 0.81
        assert response.economic_accountability == "clean"
    
    def test_default_values(self):
        """Test default values when response is missing fields."""
        response = MeeetTrustResponse({})
        
        assert response.agent_did == ""
        assert response.combined_trust_score == 0.0
        assert response.sara_risk == 0.0
        assert response.identity == "unknown"
    
    def test_repr(self):
        """Test string representation."""
        response = MeeetTrustResponse(MOCK_TRUST_RESPONSE)
        assert "0.84" in repr(response)
        assert "0.23" in repr(response)


class TestMeeetGuard:
    """Tests for MeeetGuard class."""
    
    def test_init(self):
        """Test guard initialization."""
        guard = MeeetGuard(
            api_key="test_key",
            default_min_trust=0.8,
            default_max_sara=0.5,
        )
        
        assert guard.api_key == "test_key"
        assert guard.default_min_trust == 0.8
        assert guard.default_max_sara == 0.5
    
    def test_init_defaults(self):
        """Test guard initialization with default values."""
        guard = MeeetGuard(api_key="test_key")
        
        assert guard.default_min_trust == 0.7
        assert guard.default_max_sara == 0.6
    
    @patch("urllib.request.urlopen")
    def test_verify_success(self, mock_urlopen):
        """Test successful trust verification."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_TRUST_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        response = guard.verify("did:meeet:agent_0x7a3f")
        
        assert response.combined_trust_score == 0.84
        assert response.sara_risk == 0.23
    
    @patch("urllib.request.urlopen")
    def test_verify_low_trust(self, mock_urlopen):
        """Test trust verification with low trust score."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_LOW_TRUST_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key", default_min_trust=0.7)
        
        with pytest.raises(TrustScoreTooLow) as exc_info:
            guard.verify("did:meeet:agent_0x1234")
        
        assert exc_info.value.score == 0.45
        assert exc_info.value.threshold == 0.7
    
    @patch("urllib.request.urlopen")
    def test_verify_high_sara(self, mock_urlopen):
        """Test trust verification with high SARA risk."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_HIGH_RISK_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key", default_max_sara=0.6)
        
        with pytest.raises(SARARiskTooHigh) as exc_info:
            guard.verify("did:meeet:agent_0x5678")
        
        assert exc_info.value.risk == 0.75
        assert exc_info.value.threshold == 0.6
    
    @patch("urllib.request.urlopen")
    def test_verify_custom_thresholds(self, mock_urlopen):
        """Test verification with custom thresholds."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_TRUST_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        
        # Should pass with higher trust threshold
        response = guard.verify("did:meeet:agent_0x7a3f", min_trust=0.5)
        assert response.combined_trust_score == 0.84
        
        # Should fail with even higher threshold
        with pytest.raises(TrustScoreTooLow):
            guard.verify("did:meeet:agent_0x7a3f", min_trust=0.9)
    
    @patch("urllib.request.urlopen")
    def test_verify_http_error(self, mock_urlopen):
        """Test handling of HTTP errors."""
        import urllib.error
        
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://test",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=None,
        )
        
        guard = MeeetGuard(api_key="test_key")
        
        with pytest.raises(TrustVerificationError) as exc_info:
            guard.verify("did:meeet:agent_0x7a3f")
        
        assert "401" in str(exc_info.value)
    
    @patch("urllib.request.urlopen")
    def test_crewai_hook(self, mock_urlopen):
        """Test CrewAI hook."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_TRUST_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.crewai_before_task_hook("did:meeet:agent_0x7a3f")
        
        assert result is True
    
    @patch("urllib.request.urlopen")
    def test_autogen_middleware(self, mock_urlopen):
        """Test AutoGen middleware."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_TRUST_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.autogen_middleware("did:meeet:agent_0x7a3f")
        
        assert result is True
    
    @patch("urllib.request.urlopen")
    def test_langgraph_node(self, mock_urlopen):
        """Test LangGraph node."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_TRUST_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        state = {"agent_did": "did:meeet:agent_0x7a3f"}
        
        result = guard.langgraph_node(state)
        
        assert result["trust_score"] == 0.84
        assert result["sara_risk"] == 0.23
        assert result["trust_verified"] is True
    
    def test_langgraph_node_no_agent_did(self):
        """Test LangGraph node without agent_did."""
        guard = MeeetGuard(api_key="test_key")
        
        with pytest.raises(TrustVerificationError):
            guard.langgraph_node({})


class TestBeforeActionDecorator:
    """Tests for before_action decorator."""
    
    @patch("urllib.request.urlopen")
    def test_decorator_success(self, mock_urlopen):
        """Test decorator with successful verification."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_TRUST_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did: str, data: str):
            return f"Task executed for {agent_did} with {data}"
        
        result = my_task(agent_did="did:meeet:agent_0x7a3f", data="test")
        assert "did:meeet:agent_0x7a3f" in result
    
    @patch("urllib.request.urlopen")
    def test_decorator_failure(self, mock_urlopen):
        """Test decorator with failed verification."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_LOW_TRUST_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key", default_min_trust=0.7)
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did: str):
            return "Task executed"
        
        with pytest.raises(TrustScoreTooLow):
            my_task(agent_did="did:meeet:agent_0x1234")
    
    def test_decorator_no_agent_did(self):
        """Test decorator when agent_did is not provided."""
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action()
        def my_task(data: str):
            return "Task executed"
        
        with pytest.raises(TrustVerificationError):
            my_task(data="test")


class TestExceptions:
    """Tests for custom exceptions."""
    
    def test_trust_verification_error(self):
        """Test TrustVerificationError."""
        error = TrustVerificationError("Test error")
        assert str(error) == "Test error"
    
    def test_trust_score_too_low(self):
        """Test TrustScoreTooLow exception."""
        error = TrustScoreTooLow("Trust too low", score=0.5, threshold=0.7)
        assert error.score == 0.5
        assert error.threshold == 0.7
    
    def test_sara_risk_too_high(self):
        """Test SARARiskTooHigh exception."""
        error = SARARiskTooHigh("Risk too high", risk=0.8, threshold=0.6)
        assert error.risk == 0.8
        assert error.threshold == 0.6


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
