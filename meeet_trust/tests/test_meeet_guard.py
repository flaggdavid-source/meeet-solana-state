"""
Tests for MeeetGuard - the core trust verification class.
"""

import pytest
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from meeet_trust import MeeetGuard, TrustResult, TrustVerificationFailed


class TestMeeetGuard:
    """Test cases for MeeetGuard class."""
    
    @pytest.fixture
    def guard(self):
        """Create a MeeetGuard instance for testing."""
        return MeeetGuard(
            api_key="test_api_key",
            default_min_trust=0.5,
            default_max_sara=0.6,
            block_on_fail=True,
        )
    
    def test_verify_trust_success(self, guard):
        """Test successful trust verification."""
        with patch.object(guard, '_get_trust_score', return_value=0.85), \
             patch.object(guard, '_get_sara_risk', return_value=0.3):
            
            result = guard.verify_trust(
                agent_did="did:meeet:test_agent",
                min_trust=0.5,
                max_sara=0.6,
            )
            
            assert result.agent_did == "did:meeet:test_agent"
            assert result.trust_score == 0.85
            assert result.sara_risk == 0.3
            assert result.passed is True
            assert result.blocked is False
    
    def test_verify_trust_low_score(self, guard):
        """Test trust verification fails with low trust score."""
        with patch.object(guard, '_get_trust_score', return_value=0.3), \
             patch.object(guard, '_get_sara_risk', return_value=0.3):
            
            result = guard.verify_trust(
                agent_did="did:meeet:test_agent",
                min_trust=0.5,
                max_sara=0.6,
            )
            
            assert result.trust_score == 0.3
            assert result.passed is False
            assert result.blocked is True
            assert "below threshold" in result.message
    
    def test_verify_trust_high_sara(self, guard):
        """Test trust verification fails with high SARA risk."""
        with patch.object(guard, '_get_trust_score', return_value=0.85), \
             patch.object(guard, '_get_sara_risk', return_value=0.8):
            
            result = guard.verify_trust(
                agent_did="did:meeet:test_agent",
                min_trust=0.5,
                max_sara=0.6,
            )
            
            assert result.sara_risk == 0.8
            assert result.passed is False
            assert result.blocked is True
            assert "above threshold" in result.message
    
    def test_verify_trust_api_failure(self, guard):
        """Test trust verification handles API failures gracefully."""
        with patch.object(guard, '_get_trust_score', return_value=0.0), \
             patch.object(guard, '_get_sara_risk', return_value=1.0):
            result = guard.verify_trust(
                agent_did="did:meeet:test_agent",
                min_trust=0.5,
                max_sara=0.6,
            )
            
            # Should return 0.0 trust and 1.0 risk on failure (blocks by default)
            assert result.trust_score == 0.0
            assert result.sara_risk == 1.0
            assert result.passed is False
            assert result.blocked is True
    
    def test_check_and_raise_success(self, guard):
        """Test check_and_raise passes on successful verification."""
        with patch.object(guard, '_get_trust_score', return_value=0.85), \
             patch.object(guard, '_get_sara_risk', return_value=0.3):
            
            result = guard.check_and_raise(
                agent_did="did:meeet:test_agent",
                min_trust=0.5,
                max_sara=0.6,
            )
            
            assert isinstance(result, TrustResult)
            assert result.passed is True
    
    def test_check_and_raise_failure(self, guard):
        """Test check_and_raise raises exception on failure."""
        with patch.object(guard, '_get_trust_score', return_value=0.3), \
             patch.object(guard, '_get_sara_risk', return_value=0.3):
            
            with pytest.raises(TrustVerificationFailed) as exc_info:
                guard.check_and_raise(
                    agent_did="did:meeet:test_agent",
                    min_trust=0.5,
                    max_sara=0.6,
                )
            
            assert "below threshold" in str(exc_info.value)
    
    def test_check_and_raise_no_block(self, guard):
        """Test check_and_raise doesn't raise when block_on_fail is False."""
        guard_no_block = MeeetGuard(
            api_key="test_api_key",
            block_on_fail=False,
        )
        
        with patch.object(guard_no_block, '_get_trust_score', return_value=0.3), \
             patch.object(guard_no_block, '_get_sara_risk', return_value=0.3):
            
            # Should not raise
            result = guard_no_block.check_and_raise(
                agent_did="did:meeet:test_agent",
                min_trust=0.5,
                max_sara=0.6,
            )
            
            assert result.passed is False
            assert result.blocked is False


class TestBeforeActionDecorator:
    """Test cases for the before_action decorator."""
    
    @pytest.fixture
    def guard(self):
        """Create a MeeetGuard instance for testing."""
        return MeeetGuard(
            api_key="test_api_key",
            default_min_trust=0.5,
            default_max_sara=0.6,
            block_on_fail=True,
        )
    
    def test_decorator_passes(self, guard):
        """Test decorator allows function to execute on success."""
        with patch.object(guard, '_get_trust_score', return_value=0.85), \
             patch.object(guard, '_get_sara_risk', return_value=0.3):
            
            @guard.before_action(min_trust=0.5)
            def my_function(agent_did):
                return "function executed"
            
            result = my_function("did:meeet:test_agent")
            assert result == "function executed"
    
    def test_decorator_blocks(self, guard):
        """Test decorator blocks function on failure."""
        with patch.object(guard, '_get_trust_score', return_value=0.3), \
             patch.object(guard, '_get_sara_risk', return_value=0.3):
            
            @guard.before_action(min_trust=0.5)
            def my_function(agent_did):
                return "function executed"
            
            with pytest.raises(TrustVerificationFailed):
                my_function("did:meeet:test_agent")
    
    def test_decorator_with_kwargs(self, guard):
        """Test decorator works with keyword arguments."""
        with patch.object(guard, '_get_trust_score', return_value=0.85), \
             patch.object(guard, '_get_sara_risk', return_value=0.3):
            
            @guard.before_action(min_trust=0.5)
            def my_function(agent_did=None, name="default"):
                return f"executed for {name}"
            
            result = my_function(agent_did="did:meeet:test_agent", name="test")
            assert result == "executed for test"
    
    def test_decorator_no_agent_did(self, guard):
        """Test decorator skips check when no agent_did found."""
        with patch.object(guard, '_get_trust_score', return_value=0.85), \
             patch.object(guard, '_get_sara_risk', return_value=0.3):
            
            @guard.before_action(min_trust=0.5)
            def my_function(name):
                return f"executed for {name}"
            
            # Should execute without checking trust (no agent_did param)
            result = my_function("test")
            assert result == "executed for test"


class TestTrustResult:
    """Test cases for TrustResult dataclass."""
    
    def test_trust_result_creation(self):
        """Test TrustResult can be created with all fields."""
        result = TrustResult(
            agent_did="did:meeet:test",
            trust_score=0.8,
            sara_risk=0.2,
            passed=True,
            blocked=False,
            message="Trust verification passed",
            raw_response={"extra": "data"},
        )
        
        assert result.agent_did == "did:meeet:test"
        assert result.trust_score == 0.8
        assert result.sara_risk == 0.2
        assert result.passed is True
        assert result.blocked is False
        assert result.message == "Trust verification passed"
        assert result.raw_response == {"extra": "data"}
    
    def test_trust_result_defaults(self):
        """Test TrustResult default values."""
        result = TrustResult(
            agent_did="did:meeet:test",
            trust_score=0.5,
            sara_risk=0.5,
            passed=False,
            blocked=True,
            message="Failed",
            raw_response={},
        )
        
        assert result.agent_did == "did:meeet:test"
        assert isinstance(result.raw_response, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
