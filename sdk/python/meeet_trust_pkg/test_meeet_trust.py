"""
Tests for MEEET Trust Guard
"""

import unittest
from unittest.mock import patch, MagicMock
import json

from meeet_trust import (
    MeeetGuard,
    MeeetTrustError,
    TrustCheckFailedError,
    check_trust,
    DEFAULT_MIN_TRUST,
    DEFAULT_SARA_THRESHOLD,
)


class TestMeeetGuard(unittest.TestCase):
    """Test MeeetGuard class."""

    def test_init_with_api_key(self):
        """Test initialization with API key."""
        guard = MeeetGuard(api_key="test_key")
        self.assertEqual(guard.api_key, "test_key")
        self.assertEqual(guard.default_min_trust, 0.5)
        self.assertEqual(guard.default_sara_threshold, 0.6)
        self.assertTrue(guard.block_on_fail)

    def test_init_with_env_var(self):
        """Test initialization with environment variable."""
        import os
        with patch.dict(os.environ, {"MEEET_API_KEY": "env_key"}):
            guard = MeeetGuard()
            self.assertEqual(guard.api_key, "env_key")

    def test_init_custom_defaults(self):
        """Test initialization with custom defaults."""
        guard = MeeetGuard(
            api_key="test_key",
            default_min_trust=0.8,
            default_sara_threshold=0.3,
            block_on_fail=False
        )
        self.assertEqual(guard.default_min_trust, 0.8)
        self.assertEqual(guard.default_sara_threshold, 0.3)
        self.assertFalse(guard.block_on_fail)

    @patch("meeet_trust.urllib.request.urlopen")
    def test_check_trust_pass(self, mock_urlopen):
        """Test trust check passes."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)

        guard = MeeetGuard(api_key="test_key")
        result = guard.check_trust(agent_did="did:meeet:abc123", min_trust=0.7)

        self.assertTrue(result["trust_passed"])
        self.assertTrue(result["sara_passed"])
        self.assertTrue(result["overall_passed"])
        self.assertEqual(result["trust_score"], 0.8)
        self.assertEqual(result["sara_risk"], 0.2)

    @patch("meeet_trust.urllib.request.urlopen")
    def test_check_trust_fail_low_score(self, mock_urlopen):
        """Test trust check fails due to low trust score."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.3,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)

        guard = MeeetGuard(api_key="test_key", block_on_fail=False)
        result = guard.check_trust(agent_did="did:meeet:abc123", min_trust=0.7)

        self.assertFalse(result["trust_passed"])
        self.assertTrue(result["sara_passed"])
        self.assertFalse(result["overall_passed"])

    @patch("meeet_trust.urllib.request.urlopen")
    def test_check_trust_fail_high_sara(self, mock_urlopen):
        """Test trust check fails due to high SARA risk."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.8
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)

        guard = MeeetGuard(api_key="test_key", block_on_fail=False)
        result = guard.check_trust(agent_did="did:meeet:abc123", sara_threshold=0.6)

        self.assertTrue(result["trust_passed"])
        self.assertFalse(result["sara_passed"])
        self.assertFalse(result["overall_passed"])

    @patch("meeet_trust.urllib.request.urlopen")
    def test_check_trust_block_on_fail(self, mock_urlopen):
        """Test trust check raises exception when blocking."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.3,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)

        guard = MeeetGuard(api_key="test_key", block_on_fail=True)
        
        with self.assertRaises(TrustCheckFailedError) as context:
            guard.check_trust(agent_did="did:meeet:abc123", min_trust=0.7)
        
        self.assertIn("trust_score", str(context.exception))

    @patch("meeet_trust.urllib.request.urlopen")
    def test_check_trust_api_error(self, mock_urlopen):
        """Test trust check handles API errors."""
        import urllib.error
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://test",
            code=500,
            msg="Internal Error",
            hdrs={},
            fp=None
        )

        guard = MeeetGuard(api_key="test_key")
        
        with self.assertRaises(MeeetTrustError):
            guard.check_trust(agent_did="did:meeet:abc123")

    def test_before_action_decorator(self):
        """Test before_action decorator."""
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did):
            return f"Task for {agent_did}"
        
        # The decorator should be callable
        self.assertTrue(callable(my_task))

    def test_crewai_hook(self):
        """Test CrewAI hook."""
        guard = MeeetGuard(api_key="test_key")
        # Should be callable
        self.assertTrue(callable(guard.crewai_before_task_hook))

    def test_autogen_middleware(self):
        """Test AutoGen middleware."""
        guard = MeeetGuard(api_key="test_key")
        # Should be callable
        self.assertTrue(callable(guard.autogen_middleware))

    def test_langgraph_node(self):
        """Test LangGraph node."""
        guard = MeeetGuard(api_key="test_key")
        # Should be callable
        self.assertTrue(callable(guard.langgraph_node))


class TestConvenienceFunction(unittest.TestCase):
    """Test convenience function."""

    @patch("meeet_trust.MeeetGuard")
    def test_check_trust_function(self, mock_guard_class):
        """Test check_trust convenience function."""
        mock_guard = MagicMock()
        mock_guard.check_trust.return_value = {"overall_passed": True}
        mock_guard_class.return_value = mock_guard

        result = check_trust(
            agent_did="did:meeet:abc123",
            api_key="test_key",
            min_trust=0.7
        )

        self.assertTrue(result["overall_passed"])
        mock_guard_class.assert_called_once_with(api_key="test_key")
        mock_guard.check_trust.assert_called_once()


class TestConstants(unittest.TestCase):
    """Test constants."""

    def test_default_values(self):
        """Test default constants."""
        self.assertEqual(DEFAULT_MIN_TRUST, 0.5)
        self.assertEqual(DEFAULT_SARA_THRESHOLD, 0.6)


if __name__ == "__main__":
    unittest.main()
