"""
Tests for meeet_trust package.
"""

import json
import pytest
from unittest.mock import Mock, patch

from meeet_trust import (
    MeeetGuard,
    TrustVerificationError,
    TrustScoreTooLow,
    SARARiskTooHigh,
)


# Mock API responses
MOCK_TRUST_RESPONSE = {
    "agent_did": "did:agent:test123",
    "trust_score": 0.85,
    "verification_level": 7,
    "gates_passed": ["identity", "reputation", "activity", "skills", "ethics", "impact", "community"]
}

MOCK_SARA_RESPONSE = {
    "agent_did": "did:agent:test123",
    "sara_risk": 0.2,
    "risk_factors": [],
    "assessment_date": "2024-01-01"
}


class TestMeeetGuard:
    """Test MeeetGuard class."""
    
    def test_init(self):
        """Test guard initialization."""
        guard = MeeetGuard(api_key="test_key")
        assert guard.api_key == "test_key"
        assert guard.default_min_trust == 0.5
        assert guard.default_max_sara == 0.6
    
    def test_init_custom_thresholds(self):
        """Test guard initialization with custom thresholds."""
        guard = MeeetGuard(
            api_key="test_key",
            default_min_trust=0.7,
            default_max_sara=0.3,
        )
        assert guard.default_min_trust == 0.7
        assert guard.default_max_sara == 0.3
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_get_trust_score(self, mock_urlopen):
        """Test getting trust score from API."""
        mock_response = Mock()
        mock_response.read.return_value = json.dumps(MOCK_TRUST_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.get_trust_score("did:agent:test123")
        
        assert result["trust_score"] == 0.85
        assert result["agent_did"] == "did:agent:test123"
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_get_sara_risk(self, mock_urlopen):
        """Test getting SARA risk from API."""
        mock_response = Mock()
        mock_response.read.return_value = json.dumps(MOCK_SARA_RESPONSE).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.get_sara_risk("did:agent:test123")
        
        assert result["sara_risk"] == 0.2
        assert result["agent_did"] == "did:agent:test123"
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_verify_trust_success(self, mock_urlopen):
        """Test successful trust verification."""
        mock_response = Mock()
        
        call_count = [0]
        def read_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return json.dumps(MOCK_TRUST_RESPONSE).encode()
            else:
                return json.dumps(MOCK_SARA_RESPONSE).encode()
        
        mock_response.read.side_effect = read_side_effect
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.verify_trust("did:agent:test123", min_trust=0.5, max_sara=0.6)
        
        assert result["trust_verified"] is True
        assert result["sara_verified"] is True
        assert result["trust_score"] == 0.85
        assert result["sara_risk"] == 0.2
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_verify_trust_low_score(self, mock_urlopen):
        """Test trust verification with low trust score."""
        mock_trust_response = {"trust_score": 0.3, "agent_did": "did:agent:test123"}
        mock_sara_response = {"sara_risk": 0.2, "agent_did": "did:agent:test123"}
        
        mock_response = Mock()
        
        call_count = [0]
        def read_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return json.dumps(mock_trust_response).encode()
            else:
                return json.dumps(mock_sara_response).encode()
        
        mock_response.read.side_effect = read_side_effect
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key", block_on_low_trust=True)
        
        with pytest.raises(TrustScoreTooLow) as exc_info:
            guard.verify_trust("did:agent:test123", min_trust=0.5)
        
        assert exc_info.value.trust_score == 0.3
        assert exc_info.value.threshold == 0.5
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_verify_trust_high_sara(self, mock_urlopen):
        """Test trust verification with high SARA risk."""
        mock_trust_response = {"trust_score": 0.85, "agent_did": "did:agent:test123"}
        mock_sara_response = {"sara_risk": 0.8, "agent_did": "did:agent:test123"}
        
        mock_response = Mock()
        
        call_count = [0]
        def read_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return json.dumps(mock_trust_response).encode()
            else:
                return json.dumps(mock_sara_response).encode()
        
        mock_response.read.side_effect = read_side_effect
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key", block_on_high_sara=True)
        
        with pytest.raises(SARARiskTooHigh) as exc_info:
            guard.verify_trust("did:agent:test123", max_sara=0.6)
        
        assert exc_info.value.sara_risk == 0.8
        assert exc_info.value.max_threshold == 0.6
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_decorator_allows(self, mock_urlopen):
        """Test decorator allows action when trust verified."""
        mock_response = Mock()
        
        call_count = [0]
        def read_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return json.dumps(MOCK_TRUST_RESPONSE).encode()
            else:
                return json.dumps(MOCK_SARA_RESPONSE).encode()
        
        mock_response.read.side_effect = read_side_effect
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.5)
        def my_task(agent_did):
            return f"Task executed for {agent_did}"
        
        result = my_task("did:agent:test123")
        assert result == "Task executed for did:agent:test123"
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_decorator_blocks(self, mock_urlopen):
        """Test decorator blocks action when trust verification fails."""
        mock_trust_response = {"trust_score": 0.3, "agent_did": "did:agent:test123"}
        mock_sara_response = {"sara_risk": 0.2, "agent_did": "did:agent:test123"}
        
        mock_response = Mock()
        
        call_count = [0]
        def read_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return json.dumps(mock_trust_response).encode()
            else:
                return json.dumps(mock_sara_response).encode()
        
        mock_response.read.side_effect = read_side_effect
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.5)
        def my_task(agent_did):
            return "Task executed"
        
        with pytest.raises(TrustScoreTooLow):
            my_task("did:agent:test123")


class TestFrameworkIntegrations:
    """Test framework-specific integrations."""
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_crewai_hook(self, mock_urlopen):
        """Test CrewAI before_task hook."""
        mock_response = Mock()
        
        call_count = [0]
        def read_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return json.dumps(MOCK_TRUST_RESPONSE).encode()
            else:
                return json.dumps(MOCK_SARA_RESPONSE).encode()
        
        mock_response.read.side_effect = read_side_effect
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        hook = guard.crewai_before_task(min_trust=0.5)
        
        # Create mock task with mock agent
        mock_task = Mock()
        mock_task.agent = Mock()
        mock_task.agent.did = "did:agent:test123"
        
        # Should not raise
        hook(mock_task)
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_autogen_middleware(self, mock_urlopen):
        """Test AutoGen middleware."""
        mock_response = Mock()
        
        call_count = [0]
        def read_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return json.dumps(MOCK_TRUST_RESPONSE).encode()
            else:
                return json.dumps(MOCK_SARA_RESPONSE).encode()
        
        mock_response.read.side_effect = read_side_effect
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        middleware = guard.autogen_middleware(min_trust=0.5)
        
        # Create mock agent
        mock_agent = Mock()
        mock_agent.did = "did:agent:test123"
        
        result = middleware(mock_agent, "test message")
        assert result is True
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_langgraph_node(self, mock_urlopen):
        """Test LangGraph node."""
        mock_response = Mock()
        
        call_count = [0]
        def read_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return json.dumps(MOCK_TRUST_RESPONSE).encode()
            else:
                return json.dumps(MOCK_SARA_RESPONSE).encode()
        
        mock_response.read.side_effect = read_side_effect
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key")
        node = guard.langgraph_node(min_trust=0.5)
        
        state = {"agent_did": "did:agent:test123"}
        result = node(state)
        
        assert result["trust_verified"] is True
        assert result["trust_score"] == 0.85


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
