"""
Tests for MEEET Trust Guard
"""

import json
import unittest
from unittest.mock import Mock, patch, MagicMock

import meeet_trust
from meeet_trust import (
    MeeetGuard,
    TrustResponse,
    TrustScoreTooLow,
    SaraRiskTooHigh,
    TrustApiError,
    quick_verify,
)


class TestTrustResponse(unittest.TestCase):
    """Test TrustResponse model."""
    
    def test_trust_response_creation(self):
        """Test creating a TrustResponse."""
        raw = {"agent_did": "did:meeet:test123", "trust_score": 0.85}
        response = TrustResponse(
            agent_did="did:meeet:test123",
            trust_score=0.85,
            sara_risk=0.2,
            trust_level="trusted",
            capabilities=["verify", "discover"],
            domains=["quantum", "ai"],
            reputation=500,
            is_verified=True,
            raw=raw,
        )
        
        self.assertEqual(response.agent_did, "did:meeet:test123")
        self.assertEqual(response.trust_score, 0.85)
        self.assertEqual(response.sara_risk, 0.2)
        self.assertEqual(response.trust_level, "trusted")
        self.assertEqual(response.capabilities, ["verify", "discover"])
        self.assertEqual(response.domains, ["quantum", "ai"])
        self.assertEqual(response.reputation, 500)
        self.assertTrue(response.is_verified)
    
    def test_trust_response_repr(self):
        """Test TrustResponse string representation."""
        response = TrustResponse(
            agent_did="did:meeet:test123",
            trust_score=0.85,
            sara_risk=0.2,
            trust_level="trusted",
            capabilities=[],
            domains=[],
            reputation=0,
            is_verified=False,
            raw={},
        )
        
        repr_str = repr(response)
        # DID is truncated in repr
        self.assertIn("did:meeet:test12", repr_str)
        self.assertIn("0.85", repr_str)
        self.assertIn("trusted", repr_str)


class TestMeeetGuardInit(unittest.TestCase):
    """Test MeeetGuard initialization."""
    
    def test_default_init(self):
        """Test initialization with defaults."""
        guard = MeeetGuard()
        
        self.assertEqual(guard.base_url, "https://meeet.world/api")
        self.assertEqual(guard.timeout, 30)
        self.assertEqual(guard.api_key, "")
    
    def test_custom_init(self):
        """Test initialization with custom values."""
        guard = MeeetGuard(
            api_key="test_key",
            base_url="https://custom.api.com",
            timeout=60,
        )
        
        self.assertEqual(guard.api_key, "test_key")
        self.assertEqual(guard.base_url, "https://custom.api.com")
        self.assertEqual(guard.timeout, 60)
    
    @patch.dict("os.environ", {"MEEET_API_KEY": "env_key"})
    def test_api_key_from_env(self):
        """Test API key from environment variable."""
        guard = MeeetGuard()
        self.assertEqual(guard.api_key, "env_key")


class TestTrustApiCall(unittest.TestCase):
    """Test Trust API calls."""
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_call_trust_api_success(self, mock_urlopen):
        """Test successful trust API call."""
        # Mock response
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "trust_level": "trusted",
            "capabilities": ["verify", "discover"],
            "domains": ["quantum"],
            "reputation": 500,
            "is_verified": True,
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard()
        result = guard._call_trust_api("did:meeet:agent123")
        
        self.assertEqual(result.agent_did, "did:meeet:agent123")
        self.assertEqual(result.trust_score, 0.85)
        self.assertEqual(result.sara_risk, 0.15)
        self.assertEqual(result.trust_level, "trusted")
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_call_trust_api_http_error(self, mock_urlopen):
        """Test trust API HTTP error."""
        import urllib.error
        
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=None,
        )
        
        guard = MeeetGuard()
        
        with self.assertRaises(TrustApiError) as ctx:
            guard._call_trust_api("did:meeet:agent123")
        
        self.assertIn("401", str(ctx.exception))


class TestVerify(unittest.TestCase):
    """Test verify() method."""
    
    @patch("meeet_trust.MeeetGuard._call_trust_api")
    def test_verify_success(self, mock_call_api):
        """Test successful verification."""
        mock_call_api.return_value = TrustResponse(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.15,
            trust_level="trusted",
            capabilities=[],
            domains=[],
            reputation=0,
            is_verified=False,
            raw={},
        )
        
        guard = MeeetGuard()
        result = guard.verify("did:meeet:agent123", min_trust=0.7, max_sara=0.6)
        
        self.assertEqual(result.trust_score, 0.85)
        self.assertEqual(result.sara_risk, 0.15)
    
    @patch("meeet_trust.MeeetGuard._call_trust_api")
    def test_verify_low_trust(self, mock_call_api):
        """Test verification fails on low trust."""
        mock_call_api.return_value = TrustResponse(
            agent_did="did:meeet:agent123",
            trust_score=0.5,
            sara_risk=0.1,
            trust_level="pending",
            capabilities=[],
            domains=[],
            reputation=0,
            is_verified=False,
            raw={},
        )
        
        guard = MeeetGuard()
        
        with self.assertRaises(TrustScoreTooLow) as ctx:
            guard.verify("did:meeet:agent123", min_trust=0.7)
        
        self.assertEqual(ctx.exception.score, 0.5)
        self.assertEqual(ctx.exception.threshold, 0.7)
    
    @patch("meeet_trust.MeeetGuard._call_trust_api")
    def test_verify_high_sara(self, mock_call_api):
        """Test verification fails on high SARA risk."""
        mock_call_api.return_value = TrustResponse(
            agent_did="did:meeet:agent123",
            trust_score=0.9,
            sara_risk=0.8,
            trust_level="trusted",
            capabilities=[],
            domains=[],
            reputation=0,
            is_verified=False,
            raw={},
        )
        
        guard = MeeetGuard()
        
        with self.assertRaises(SaraRiskTooHigh) as ctx:
            guard.verify("did:meeet:agent123", max_sara=0.6)
        
        self.assertEqual(ctx.exception.risk_score, 0.8)
        self.assertEqual(ctx.exception.threshold, 0.6)
    
    @patch("meeet_trust.MeeetGuard._call_trust_api")
    def test_verify_no_block_on_fail(self, mock_call_api):
        """Test verification doesn't block when disabled."""
        mock_call_api.return_value = TrustResponse(
            agent_did="did:meeet:agent123",
            trust_score=0.5,
            sara_risk=0.1,
            trust_level="pending",
            capabilities=[],
            domains=[],
            reputation=0,
            is_verified=False,
            raw={},
        )
        
        guard = MeeetGuard()
        result = guard.verify(
            "did:meeet:agent123",
            min_trust=0.7,
            block_on_low_trust=False,
        )
        
        # Should return response without raising
        self.assertEqual(result.trust_score, 0.5)


class TestBeforeActionDecorator(unittest.TestCase):
    """Test before_action decorator."""
    
    @patch("meeet_trust.MeeetGuard.verify")
    def test_decorator_success(self, mock_verify):
        """Test decorator allows verified agent."""
        mock_verify.return_value = TrustResponse(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.15,
            trust_level="trusted",
            capabilities=[],
            domains=[],
            reputation=0,
            is_verified=False,
            raw={},
        )
        
        guard = MeeetGuard()
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did):
            return "task executed"
        
        result = my_task(agent_did="did:meeet:agent123")
        
        self.assertEqual(result, "task executed")
        mock_verify.assert_called_once()
    
    @patch("meeet_trust.MeeetGuard.verify")
    def test_decorator_blocks_low_trust(self, mock_verify):
        """Test decorator blocks low trust agent."""
        mock_verify.side_effect = TrustScoreTooLow(
            "did:meeet:agent123", 0.5, 0.7
        )
        
        guard = MeeetGuard()
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did):
            return "task executed"
        
        with self.assertRaises(TrustScoreTooLow):
            my_task(agent_did="did:meeet:agent123")
    
    @patch("meeet_trust.MeeetGuard.verify")
    def test_decorator_no_block_on_fail(self, mock_verify):
        """Test decorator with block_on_fail=False."""
        mock_verify.side_effect = TrustScoreTooLow(
            "did:meeet:agent123", 0.5, 0.7
        )
        
        guard = MeeetGuard()
        
        @guard.before_action(min_trust=0.7, block_on_fail=False)
        def my_task(agent_did):
            return "task executed"
        
        result = my_task(agent_did="did:meeet:agent123")
        
        # Should return None when blocked
        self.assertIsNone(result)
    
    def test_decorator_missing_param(self):
        """Test decorator with missing agent_did param."""
        guard = MeeetGuard()
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did):
            return "task executed"
        
        # Missing agent_did should raise error
        with self.assertRaises(meeet_trust.MeeetTrustError):
            my_task(other_param="value")


class TestQuickVerify(unittest.TestCase):
    """Test quick_verify convenience function."""
    
    @patch("meeet_trust.MeeetGuard")
    def test_quick_verify(self, mock_guard_class):
        """Test quick_verify function."""
        mock_guard = MagicMock()
        mock_guard_class.return_value = mock_guard
        
        mock_response = TrustResponse(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.15,
            trust_level="trusted",
            capabilities=[],
            domains=[],
            reputation=0,
            is_verified=False,
            raw={},
        )
        mock_guard.verify.return_value = mock_response
        
        result = quick_verify("did:meeet:agent123", min_trust=0.7)
        
        mock_guard_class.assert_called_once()
        mock_guard.verify.assert_called_once_with(
            agent_did="did:meeet:agent123",
            min_trust=0.7,
            max_sara=0.6,
        )
        self.assertEqual(result.trust_score, 0.85)


class TestFrameworkIntegrations(unittest.TestCase):
    """Test framework-specific integrations."""
    
    def test_crewai_callback(self):
        """Test CrewAI callback returns callable."""
        guard = MeeetGuard()
        callback = guard.crewai_taskDecorator(min_trust=0.7)
        
        # Should return a function
        self.assertTrue(callable(callback))
    
    def test_autogen_middleware(self):
        """Test AutoGen middleware returns callable."""
        guard = MeeetGuard()
        middleware = guard.autogen_middleware(min_trust=0.7)
        
        # Should return a function
        self.assertTrue(callable(middleware))
    
    def test_langgraph_node(self):
        """Test LangGraph node returns callable."""
        guard = MeeetGuard()
        node = guard.langgraph_node(min_trust=0.7)
        
        # Should return a function
        self.assertTrue(callable(node))


class TestLogging(unittest.TestCase):
    """Test logging functionality."""
    
    @patch("meeet_trust.MeeetGuard._call_trust_api")
    def test_verify_logs_check(self, mock_call_api):
        """Test that verify() logs trust check."""
        import logging
        
        mock_call_api.return_value = TrustResponse(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.15,
            trust_level="trusted",
            capabilities=[],
            domains=[],
            reputation=0,
            is_verified=False,
            raw={},
        )
        
        guard = MeeetGuard()
        
        with self.assertLogs("meeet_trust", level=logging.INFO) as cm:
            guard.verify("did:meeet:agent123", min_trust=0.7)
        
        # Check that logs contain expected messages
        log_output = " ".join(cm.output)
        self.assertIn("Verifying agent", log_output)
        self.assertIn("Trust check result", log_output)


if __name__ == "__main__":
    unittest.main()
