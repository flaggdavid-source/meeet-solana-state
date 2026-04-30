"""Tests for meeet_trust package."""

import unittest
from unittest.mock import patch, MagicMock
import json

from meeet_trust import (
    MeeetGuard,
    TrustResult,
    MeeetTrustError,
    TrustCheckFailedError,
    DEFAULT_MIN_TRUST,
    DEFAULT_MAX_SARA_RISK,
)


class TestMeeetGuard(unittest.TestCase):
    """Test cases for MeeetGuard class."""

    def setUp(self):
        """Set up test fixtures."""
        self.api_key = "test_api_key"
        self.guard = MeeetGuard(
            api_key=self.api_key,
            min_trust=0.7,
            max_sara_risk=0.5
        )

    def test_init_default_values(self):
        """Test initialization with default values."""
        guard = MeeetGuard(api_key="test_key")
        self.assertEqual(guard.min_trust, DEFAULT_MIN_TRUST)
        self.assertEqual(guard.max_sara_risk, DEFAULT_MAX_SARA_RISK)

    def test_init_custom_values(self):
        """Test initialization with custom values."""
        guard = MeeetGuard(
            api_key="test_key",
            min_trust=0.8,
            max_sara_risk=0.3
        )
        self.assertEqual(guard.min_trust, 0.8)
        self.assertEqual(guard.max_sara_risk, 0.3)

    @patch("meeet_trust.urllib.request.urlopen")
    def test_check_trust_success(self, mock_urlopen):
        """Test successful trust check."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.85,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response

        result = self.guard.check_trust("did:meeet:agent123")

        self.assertEqual(result.agent_did, "did:meeet:agent123")
        self.assertEqual(result.trust_score, 0.85)
        self.assertEqual(result.sara_risk, 0.2)

    @patch("meeet_trust.urllib.request.urlopen")
    def test_check_trust_http_error(self, mock_urlopen):
        """Test trust check with HTTP error."""
        import urllib.error
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://test",
            code=404,
            msg="Not Found",
            hdrs={},
            fp=None
        )

        result = self.guard.check_trust("did:meeet:agent123")

        self.assertFalse(result.passed)
        self.assertIn("404", result.blocked_reason)

    @patch("meeet_trust.urllib.request.urlopen")
    def test_check_trust_network_error(self, mock_urlopen):
        """Test trust check with network error."""
        import urllib.error
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")

        result = self.guard.check_trust("did:meeet:agent123")

        self.assertFalse(result.passed)
        self.assertIn("Network error", result.blocked_reason)

    def test_evaluate_trust_pass(self):
        """Test trust evaluation that passes."""
        result = self.guard._evaluate_trust(
            "did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.2
        )

        self.assertTrue(result.passed)
        self.assertIsNone(result.blocked_reason)

    def test_evaluate_trust_fail_low_trust(self):
        """Test trust evaluation fails due to low trust score."""
        result = self.guard._evaluate_trust(
            "did:meeet:agent123",
            trust_score=0.5,
            sara_risk=0.2
        )

        self.assertFalse(result.passed)
        self.assertIn("0.5", result.blocked_reason)
        self.assertIn("0.7", result.blocked_reason)

    def test_evaluate_trust_fail_high_sara(self):
        """Test trust evaluation fails due to high SARA risk."""
        result = self.guard._evaluate_trust(
            "did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.7
        )

        self.assertFalse(result.passed)
        self.assertIn("0.7", result.blocked_reason)
        self.assertIn("0.5", result.blocked_reason)

    def test_before_action_decorator(self):
        """Test before_action decorator."""
        @self.guard.before_action(agent_did="did:meeet:agent123")
        def test_task():
            return "executed"

        with patch.object(self.guard, 'check_trust') as mock_check:
            with patch.object(self.guard, '_evaluate_trust') as mock_eval:
                mock_check.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.85,
                    sara_risk=0.2,
                    passed=True
                )
                mock_eval.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.85,
                    sara_risk=0.2,
                    passed=True
                )
                result = test_task()
                self.assertEqual(result, "executed")

    def test_before_action_blocked(self):
        """Test before_action decorator blocks on failure."""
        @self.guard.before_action(agent_did="did:meeet:agent123")
        def test_task():
            return "executed"

        with patch.object(self.guard, 'check_trust') as mock_check:
            with patch.object(self.guard, '_evaluate_trust') as mock_eval:
                mock_check.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.3,
                    sara_risk=0.2,
                    passed=False,
                    blocked_reason="Trust too low"
                )
                mock_eval.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.3,
                    sara_risk=0.2,
                    passed=False,
                    blocked_reason="Trust too low"
                )
                with self.assertRaises(TrustCheckFailedError):
                    test_task()

    def test_crewai_before_task(self):
        """Test CrewAI before_task hook."""
        hook = self.guard.crewai_before_task("did:meeet:agent123")

        with patch.object(self.guard, 'check_trust') as mock_check:
            with patch.object(self.guard, '_evaluate_trust') as mock_eval:
                mock_check.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.85,
                    sara_risk=0.2,
                    passed=True
                )
                mock_eval.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.85,
                    sara_risk=0.2,
                    passed=True
                )
                # Should not raise
                hook()

    def test_autogen_middleware(self):
        """Test AutoGen middleware."""
        middleware = self.guard.autogen_middleware("did:meeet:agent123")

        with patch.object(self.guard, 'check_trust') as mock_check:
            with patch.object(self.guard, '_evaluate_trust') as mock_eval:
                mock_check.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.85,
                    sara_risk=0.2,
                    passed=True
                )
                mock_eval.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.85,
                    sara_risk=0.2,
                    passed=True
                )
                result = middleware(None, "test message", None)
                self.assertTrue(result)

    def test_langgraph_node(self):
        """Test LangGraph node."""
        node = self.guard.langgraph_node("did:meeet:agent123")

        with patch.object(self.guard, 'check_trust') as mock_check:
            with patch.object(self.guard, '_evaluate_trust') as mock_eval:
                mock_check.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.85,
                    sara_risk=0.2,
                    passed=True
                )
                mock_eval.return_value = TrustResult(
                    agent_did="did:meeet:agent123",
                    trust_score=0.85,
                    sara_risk=0.2,
                    passed=True
                )
                state = {"key": "value"}
                result = node(state)
                self.assertEqual(result, state)


class TestTrustResult(unittest.TestCase):
    """Test cases for TrustResult dataclass."""

    def test_trust_result_creation(self):
        """Test TrustResult creation."""
        result = TrustResult(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.2,
            passed=True
        )
        self.assertEqual(result.agent_did, "did:meeet:agent123")
        self.assertEqual(result.trust_score, 0.85)
        self.assertEqual(result.sara_risk, 0.2)
        self.assertTrue(result.passed)


class TestExceptions(unittest.TestCase):
    """Test cases for exceptions."""

    def test_trust_check_failed_error(self):
        """Test TrustCheckFailedError."""
        result = TrustResult(
            agent_did="did:meeet:agent123",
            trust_score=0.3,
            sara_risk=0.2,
            passed=False,
            blocked_reason="Trust too low"
        )
        error = TrustCheckFailedError("Trust check failed", result)
        self.assertEqual(str(error), "Trust check failed")
        self.assertEqual(error.trust_result, result)


if __name__ == "__main__":
    unittest.main()
