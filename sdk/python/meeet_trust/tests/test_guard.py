"""
Unit tests for MeeetGuard and trust verification.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from meeet_trust.guard import MeeetGuard
from meeet_trust.client import TrustScore
from meeet_trust.exceptions import (
    TrustScoreTooLow,
    SARARiskTooHigh,
    AgentNotVerified,
)


# Sample trust score data for testing
SAMPLE_TRUST_SCORE = TrustScore(
    agent_did="did:meeet:agent123",
    trust_score=0.85,
    sara_risk=0.3,
    gates_passed=7,
    gates_total=7,
    reputation=1000,
    stake_amount=100.0,
    verified=True,
    raw_response={
        "agent_did": "did:meeet:agent123",
        "trust_score": 0.85,
        "sara_risk": 0.3,
        "gates_passed": 7,
        "gates_total": 7,
        "reputation": 1000,
        "stake_amount": 100.0,
        "verified": True,
    }
)

LOW_TRUST_SCORE = TrustScore(
    agent_did="did:meeet:agent456",
    trust_score=0.3,
    sara_risk=0.2,
    gates_passed=3,
    gates_total=7,
    reputation=100,
    stake_amount=10.0,
    verified=True,
    raw_response={}
)

HIGH_RISK_SCORE = TrustScore(
    agent_did="did:meeet:agent789",
    trust_score=0.8,
    sara_risk=0.8,
    gates_passed=5,
    gates_total=7,
    reputation=500,
    stake_amount=50.0,
    verified=True,
    raw_response={}
)

UNVERIFIED_SCORE = TrustScore(
    agent_did="did:meeet:agent000",
    trust_score=0.6,
    sara_risk=0.4,
    gates_passed=4,
    gates_total=7,
    reputation=200,
    stake_amount=20.0,
    verified=False,
    raw_response={}
)


class TestMeeetGuard:
    """Tests for MeeetGuard class."""
    
    def test_init(self):
        """Test guard initialization."""
        guard = MeeetGuard(api_key="test_key", min_trust=0.7, max_sara_risk=0.5)
        assert guard.client.api_key == "test_key"
        assert guard.default_min_trust == 0.7
        assert guard.default_max_sara_risk == 0.5
        assert guard.block_on_failure is True
    
    def test_init_defaults(self):
        """Test default values."""
        guard = MeeetGuard(api_key="test_key")
        assert guard.default_min_trust == 0.5
        assert guard.default_max_sara_risk == 0.6
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_verify(self, mock_client_class):
        """Test manual verify method."""
        mock_client = Mock()
        mock_client.get_trust_score.return_value = SAMPLE_TRUST_SCORE
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.verify("did:meeet:agent123")
        
        assert result == SAMPLE_TRUST_SCORE
        mock_client.get_trust_score.assert_called_once_with("did:meeet:agent123")
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_check_passes(self, mock_client_class):
        """Test check method when agent passes."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (True, SAMPLE_TRUST_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.check("did:meeet:agent123", min_trust=0.7)
        
        assert result is True
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_check_fails(self, mock_client_class):
        """Test check method when agent fails."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (False, LOW_TRUST_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.check("did:meeet:agent456", min_trust=0.7)
        
        assert result is False


class TestBeforeActionDecorator:
    """Tests for before_action decorator."""
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_decorator_passes_verification(self, mock_client_class):
        """Test decorator allows execution when verified."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (True, SAMPLE_TRUST_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did: str, value: int):
            return f"Task completed with {value}"
        
        result = my_task("did:meeet:agent123", 42)
        
        assert result == "Task completed with 42"
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_decorator_blocks_low_trust(self, mock_client_class):
        """Test decorator blocks on low trust score."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (False, LOW_TRUST_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key", block_on_failure=True)
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did: str):
            return "Should not reach here"
        
        with pytest.raises(TrustScoreTooLow) as exc_info:
            my_task("did:meeet:agent456")
        
        assert exc_info.value.agent_did == "did:meeet:agent456"
        assert exc_info.value.trust_score == 0.3
        assert exc_info.value.min_trust == 0.7
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_decorator_blocks_high_risk(self, mock_client_class):
        """Test decorator blocks on high SARA risk."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (False, HIGH_RISK_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key", block_on_failure=True)
        
        @guard.before_action(min_trust=0.7, max_sara_risk=0.6)
        def my_task(agent_did: str):
            return "Should not reach here"
        
        with pytest.raises(SARARiskTooHigh) as exc_info:
            my_task("did:meeet:agent789")
        
        assert exc_info.value.sara_risk == 0.8
        assert exc_info.value.max_sara_risk == 0.6
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_decorator_blocks_unverified(self, mock_client_class):
        """Test decorator blocks unverified agents."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (False, UNVERIFIED_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key", block_on_failure=True)
        
        @guard.before_action(min_trust=0.5)
        def my_task(agent_did: str):
            return "Should not reach here"
        
        with pytest.raises(AgentNotVerified) as exc_info:
            my_task("did:meeet:agent000")
        
        assert exc_info.value.agent_did == "did:meeet:agent000"
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_decorator_no_block_on_failure(self, mock_client_class):
        """Test decorator allows continue on failure when block_on_failure=False."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (False, LOW_TRUST_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key", block_on_failure=False)
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did: str):
            return "Task executed"
        
        result = my_task("did:meeet:agent456")
        
        assert result is None  # Returns None when verification fails and not blocking
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_decorator_extracts_did_from_args(self, mock_client_class):
        """Test decorator extracts DID from positional args."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (True, SAMPLE_TRUST_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(value: int, agent_did: str):
            return f"Done: {value}"
        
        result = my_task(42, "did:meeet:agent123")
        
        assert result == "Done: 42"
        mock_client.verify_agent.assert_called_once()
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_decorator_extracts_did_from_kwargs(self, mock_client_class):
        """Test decorator extracts DID from keyword args."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (True, SAMPLE_TRUST_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(value: int, agent_did: str = None):
            return f"Done: {value}"
        
        result = my_task(42, agent_did="did:meeet:agent123")
        
        assert result == "Done: 42"
    
    @patch('meeet_trust.guard.MeeetTrustClient')
    def test_decorator_preserves_function_metadata(self, mock_client_class):
        """Test decorator preserves function name and docstring."""
        mock_client = Mock()
        mock_client.verify_agent.return_value = (True, SAMPLE_TRUST_SCORE)
        mock_client_class.return_value = mock_client
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did: str):
            """My docstring."""
            pass
        
        assert my_task.__name__ == "my_task"
        assert my_task.__doc__ == "My docstring."


class TestGetAgentDid:
    """Tests for DID extraction from function arguments."""
    
    def test_extract_from_did_prefix(self):
        """Test extraction from string with did:meeet: prefix."""
        guard = MeeetGuard(api_key="test_key")
        
        did = guard._get_agent_did("did:meeet:agent123", "some_other_arg")
        
        assert did == "did:meeet:agent123"
    
    def test_extract_from_kwargs(self):
        """Test extraction from kwargs."""
        guard = MeeetGuard(api_key="test_key")
        
        did = guard._get_agent_did(value=42, agent_did="did:meeet:agent123")
        
        assert did == "did:meeet:agent123"
    
    def test_extract_from_various_kwarg_names(self):
        """Test extraction from various common kwarg names."""
        guard = MeeetGuard(api_key="test_key")
        
        # agent_id
        assert guard._get_agent_did(agent_id="did:meeet:agent1") == "did:meeet:agent1"
        # did
        assert guard._get_agent_did(did="did:meeet:agent2") == "did:meeet:agent2"
        # agentDid
        assert guard._get_agent_did(agentDid="did:meeet:agent3") == "did:meeet:agent3"
    
    def test_returns_none_when_not_found(self):
        """Test returns None when no DID found."""
        guard = MeeetGuard(api_key="test_key")
        
        did = guard._get_agent_did("some_string", value=42)
        
        assert did is None


class TestCrewAIIntegration:
    """Tests for CrewAI integration."""
    
    def test_crewai_before_task_hook(self):
        """Test crewai_before_task creates valid hook."""
        from meeet_trust.guard import crewai_before_task
        
        mock_guard = Mock()
        mock_guard.verify.return_value = SAMPLE_TRUST_SCORE
        
        hook = crewai_before_task(mock_guard)
        
        # Create mock task
        mock_task = Mock()
        mock_task.agent = Mock()
        mock_task.agent.agent_did = "did:meeet:agent123"
        
        hook(mock_task)
        
        mock_guard.verify.assert_called_once_with("did:meeet:agent123")


class TestLangGraphIntegration:
    """Tests for LangGraph integration."""
    
    def test_trust_node(self):
        """Test trust_node creates valid LangGraph node."""
        from meeet_trust.guard import trust_node
        
        mock_guard = Mock()
        mock_guard.verify.return_value = SAMPLE_TRUST_SCORE
        
        node = trust_node(mock_guard)
        
        # Execute node with state
        state = {"agent_did": "did:meeet:agent123", "task": "test"}
        result = node(state)
        
        assert result["trust_verified"] is True
        assert result["trust_score"] == 0.85
        assert result["sara_risk"] == 0.3
        assert result["gates_passed"] == 7
    
    def test_trust_node_no_agent_did(self):
        """Test trust_node handles missing agent_did."""
        from meeet_trust.guard import trust_node
        
        mock_guard = Mock()
        
        node = trust_node(mock_guard)
        
        state = {"task": "test"}  # No agent_did
        result = node(state)
        
        assert result["trust_verified"] is False
        assert "No agent_did" in result["trust_error"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
