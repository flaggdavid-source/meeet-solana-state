"""
Tests for MEEET Trust Guard.

Run with: pytest meeet_trust/tests/ -v
"""

import json
import pytest
from unittest.mock import patch, MagicMock
import urllib.error

from meeet_guard import (
    MeeetGuard,
    TrustResult,
    MeeetTrustError,
    TrustCheckFailedError,
    MeeetAPIError,
    check_agent_trust,
)


# ═══ Test Fixtures ═══

@pytest.fixture
def api_key():
    return "test_api_key_12345"


@pytest.fixture
def agent_did():
    return "did:meeet:agent123"


@pytest.fixture
def guard(api_key):
    return MeeetGuard(
        api_key=api_key,
        min_trust=0.7,
        max_sara_risk=0.5,
    )


@pytest.fixture
def trust_response_passed():
    """API response for a trusted agent."""
    return {
        "agentDid": "did:meeet:agent123",
        "trustScore": 0.85,
        "saraRisk": 0.2,
        "gates": {
            "L1": "passed",
            "L2": "passed",
            "L2.5": "passed",
            "L3": "passed",
            "L4": "passed",
            "L5": "passed",
            "L6": "passed",
        },
    }


@pytest.fixture
def trust_response_low_trust():
    """API response for an agent with low trust score."""
    return {
        "agentDid": "did:meeet:agent456",
        "trustScore": 0.3,
        "saraRisk": 0.1,
        "gates": {
            "L1": "passed",
            "L2": "failed",
            "L2.5": "passed",
            "L3": "passed",
            "L4": "passed",
            "L5": "passed",
            "L6": "failed",
        },
    }


@pytest.fixture
def trust_response_high_risk():
    """API response for an agent with high SARA risk."""
    return {
        "agentDid": "did:meeet:agent789",
        "trustScore": 0.9,
        "saraRisk": 0.8,
        "gates": {
            "L1": "passed",
            "L2": "passed",
            "L2.5": "failed",
            "L3": "passed",
            "L4": "passed",
            "L5": "passed",
            "L6": "passed",
        },
    }


# ═══ Test MeeetGuard Initialization ═══

class TestMeeetGuardInit:
    """Test MeeetGuard initialization."""
    
    def test_init_with_defaults(self, api_key):
        guard = MeeetGuard(api_key=api_key)
        
        assert guard.api_key == api_key
        assert guard.min_trust == 0.5
        assert guard.max_sara_risk == 0.6
        assert guard.fail_open is False
    
    def test_init_with_custom_values(self, api_key):
        guard = MeeetGuard(
            api_key=api_key,
            min_trust=0.8,
            max_sara_risk=0.3,
            fail_open=True,
        )
        
        assert guard.api_key == api_key
        assert guard.min_trust == 0.8
        assert guard.max_sara_risk == 0.3
        assert guard.fail_open is True


# ═══ Test Trust API Calls ═══

class TestTrustAPICalls:
    """Test trust API interaction."""
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_check_trust_passed(self, mock_urlopen, guard, agent_did, trust_response_passed):
        """Test trust check passes for trusted agent."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_passed).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        result = guard.check_trust(agent_did)
        
        assert result.passed is True
        assert result.trust_score == 0.85
        assert result.sara_risk == 0.2
        assert result.blocked_reason is None
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_check_trust_low_score(self, mock_urlopen, guard, agent_did, trust_response_low_trust):
        """Test trust check fails for low trust score."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_low_trust).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        result = guard.check_trust(agent_did)
        
        assert result.passed is False
        assert result.trust_score == 0.3
        assert "Trust score" in result.blocked_reason
        assert "below minimum" in result.blocked_reason
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_check_trust_high_risk(self, mock_urlopen, guard, agent_did, trust_response_high_risk):
        """Test trust check fails for high SARA risk."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_high_risk).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        result = guard.check_trust(agent_did)
        
        assert result.passed is False
        assert result.sara_risk == 0.8
        assert "SARA risk" in result.blocked_reason
        assert "above maximum" in result.blocked_reason
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_api_error(self, mock_urlopen, guard, agent_did):
        """Test handling of API errors."""
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="",
            code=500,
            msg="Internal Server Error",
            hdrs={},
            fp=None,
        )
        
        with pytest.raises(MeeetAPIError) as exc_info:
            guard.check_trust(agent_did)
        
        assert "500" in str(exc_info.value)
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_connection_error_fail_open_false(self, mock_urlopen, api_key):
        """Test handling of connection errors with fail_open=False."""
        guard = MeeetGuard(api_key=api_key, fail_open=False)
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")
        
        with pytest.raises(MeeetTrustError) as exc_info:
            guard.check_trust("did:meeet:agent123")
        
        assert "unavailable" in str(exc_info.value).lower()
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_connection_error_fail_open_true(self, mock_urlopen, api_key):
        """Test handling of connection errors with fail_open=True."""
        guard = MeeetGuard(api_key=api_key, fail_open=True)
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")
        
        result = guard.check_trust("did:meeet:agent123")
        
        assert result.passed is True
        assert result.trust_score == 1.0  # Assumed trusted


# ═══ Test Decorator Pattern ═══

class TestDecoratorPattern:
    """Test before_action decorator."""
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_decorator_passes_for_trusted_agent(self, mock_urlopen, guard, trust_response_passed):
        """Test decorator allows trusted agent."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_passed).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did):
            return f"Task completed for {agent_did}"
        
        result = my_task("did:meeet:agent123")
        
        assert result == "Task completed for did:meeet:agent123"
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_decorator_blocks_untrusted_agent(self, mock_urlopen, guard, trust_response_low_trust):
        """Test decorator blocks untrusted agent."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_low_trust).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did):
            return f"Task completed for {agent_did}"
        
        with pytest.raises(TrustCheckFailedError) as exc_info:
            my_task("did:meeet:agent456")
        
        assert "Trust score" in str(exc_info.value)
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_decorator_with_custom_threshold(self, mock_urlopen, api_key, trust_response_passed):
        """Test decorator with custom threshold."""
        guard = MeeetGuard(api_key=api_key, min_trust=0.5)
        
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_passed).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        @guard.before_action(min_trust=0.9)  # Higher than actual score
        def my_task(agent_did):
            return "Task completed"
        
        with pytest.raises(TrustCheckFailedError):
            my_task("did:meeet:agent123")


# ═══ Test Framework Integrations ═══

class TestCrewAIIntegration:
    """Test CrewAI before_task hook."""
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_crewai_hook_passes(self, mock_urlopen, guard, trust_response_passed):
        """Test CrewAI hook passes for trusted agent."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_passed).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        result = guard.crewai_before_task("did:meeet:agent123")
        
        assert result.passed is True
        assert result.trust_score == 0.85
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_crewai_hook_blocks(self, mock_urlopen, guard, trust_response_low_trust):
        """Test CrewAI hook blocks untrusted agent."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_low_trust).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        with pytest.raises(TrustCheckFailedError):
            guard.crewai_before_task("did:meeet:agent456")


class TestAutoGenIntegration:
    """Test AutoGen middleware."""
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_autogen_middleware_passes(self, mock_urlopen, guard, trust_response_passed):
        """Test AutoGen middleware passes for trusted agent."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_passed).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        result = guard.autogen_middleware("did:meeet:agent123")
        
        assert result.passed is True
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_autogen_middleware_blocks(self, mock_urlopen, guard, trust_response_high_risk):
        """Test AutoGen middleware blocks high risk agent."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_high_risk).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        with pytest.raises(TrustCheckFailedError):
            guard.autogen_middleware("did:meeet:agent789")


class TestLangGraphIntegration:
    """Test LangGraph node."""
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_langgraph_node_passes(self, mock_urlopen, guard, trust_response_passed):
        """Test LangGraph node passes for trusted agent."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_passed).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        state = {"agent_did": "did:meeet:agent123", "task": "analyze"}
        result_state = guard.langgraph_node(state)
        
        assert "agent_did" in result_state
        assert "_meeet_trust_result" in result_state
        assert result_state["_meeet_trust_result"].passed is True
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_langgraph_node_blocks(self, mock_urlopen, guard, trust_response_low_trust):
        """Test LangGraph node blocks untrusted agent."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_low_trust).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        state = {"agent_did": "did:meeet:agent456", "task": "analyze"}
        
        with pytest.raises(TrustCheckFailedError):
            guard.langgraph_node(state)
    
    def test_langgraph_node_missing_agent_did(self, guard):
        """Test LangGraph node raises error without agent_did."""
        state = {"task": "analyze"}
        
        with pytest.raises(KeyError):
            guard.langgraph_node(state)


# ═══ Test TrustResult ═══

class TestTrustResult:
    """Test TrustResult dataclass."""
    
    def test_truthiness(self):
        """Test TrustResult truthiness based on passed."""
        result_passed = TrustResult(
            agent_did="did:meeet:agent123",
            trust_score=0.8,
            sara_risk=0.2,
            passed=True,
        )
        
        result_failed = TrustResult(
            agent_did="did:meeet:agent456",
            trust_score=0.3,
            sara_risk=0.2,
            passed=False,
            blocked_reason="Trust score too low",
        )
        
        assert bool(result_passed) is True
        assert bool(result_failed) is False


# ═══ Test Convenience Functions ═══

class TestConvenienceFunctions:
    """Test convenience functions."""
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_check_agent_trust(self, mock_urlopen, trust_response_passed):
        """Test check_agent_trust convenience function."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(trust_response_passed).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        result = check_agent_trust(
            agent_did="did:meeet:agent123",
            api_key="test_key",
            min_trust=0.7,
            max_sara_risk=0.5,
        )
        
        assert result.passed is True
        assert result.trust_score == 0.85


# ═══ Test Edge Cases ═══

class TestEdgeCases:
    """Test edge cases."""
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_both_trust_and_risk_fail(self, mock_urlopen, guard):
        """Test when both trust score and SARA risk fail."""
        response = {
            "agentDid": "did:meeet:agent123",
            "trustScore": 0.3,
            "saraRisk": 0.9,
        }
        
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(response).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        result = guard.check_trust("did:meeet:agent123")
        
        assert result.passed is False
        assert "Trust score" in result.blocked_reason
        assert "SARA risk" in result.blocked_reason
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_boundary_trust_score(self, mock_urlopen, guard):
        """Test boundary trust score (exactly at threshold)."""
        response = {
            "agentDid": "did:meeet:agent123",
            "trustScore": 0.7,  # Exactly at min_trust
            "saraRisk": 0.2,
        }
        
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(response).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        result = guard.check_trust("did:meeet:agent123")
        
        # Should pass because 0.7 >= 0.7
        assert result.passed is True
    
    @patch("meeet_guard.urllib.request.urlopen")
    def test_boundary_sara_risk(self, mock_urlopen, guard):
        """Test boundary SARA risk (exactly at threshold)."""
        response = {
            "agentDid": "did:meeet:agent123",
            "trustScore": 0.9,
            "saraRisk": 0.5,  # Exactly at max_sara_risk
        }
        
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(response).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        result = guard.check_trust("did:meeet:agent123")
        
        # Should pass because 0.5 <= 0.5
        assert result.passed is True
    
    def test_alternative_agent_did_keys(self, guard):
        """Test LangGraph node accepts alternative DID keys."""
        # Test with agentDid (camelCase)
        state = {"agentDid": "did:meeet:agent123", "task": "test"}
        
        # This should raise an error since we're not mocking the API
        # but it should NOT raise a KeyError for missing agent_did
        with patch.object(guard, "_call_trust_api") as mock_call:
            mock_call.return_value = TrustResult(
                agent_did="did:meeet:agent123",
                trust_score=0.9,
                sara_risk=0.2,
                passed=True,
            )
            result = guard.langgraph_node(state)
            assert "_meeet_trust_result" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])