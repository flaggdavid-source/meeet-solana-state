"""Tests for meeet_trust package."""

import unittest
from unittest.mock import patch, MagicMock
import json

from meeet_trust import (
    MeeetGuard,
    MeeetTrustClient,
    TrustScore,
    TrustCheckResult,
    TrustAction,
    MeeetTrustException,
)


class TestTrustScore(unittest.TestCase):
    """Test TrustScore dataclass."""
    
    def test_is_trusted_pass(self):
        score = TrustScore(
            score=0.8, level="high", sara_risk=0.3, sara_level="low",
            gates_passed=7, gates_total=7, agent_did="did:meeet:test"
        )
        self.assertTrue(score.is_trusted(0.7))
    
    def test_is_trusted_fail(self):
        score = TrustScore(
            score=0.5, level="medium", sara_risk=0.3, sara_level="low",
            gates_passed=5, gates_total=7, agent_did="did:meeet:test"
        )
        self.assertFalse(score.is_trusted(0.7))
    
    def test_is_sara_safe_pass(self):
        score = TrustScore(
            score=0.8, level="high", sara_risk=0.3, sara_level="low",
            gates_passed=7, gates_total=7, agent_did="did:meeet:test"
        )
        self.assertTrue(score.is_sara_safe(0.6))
    
    def test_is_sara_safe_fail(self):
        score = TrustScore(
            score=0.8, level="high", sara_risk=0.8, sara_level="high",
            gates_passed=7, gates_total=7, agent_did="did:meeet:test"
        )
        self.assertFalse(score.is_sara_safe(0.6))


class TestTrustCheckResult(unittest.TestCase):
    """Test TrustCheckResult dataclass."""
    
    def test_allowed_true(self):
        score = TrustScore(
            score=0.8, level="high", sara_risk=0.3, sara_level="low",
            gates_passed=7, gates_total=7, agent_did="did:meeet:test"
        )
        result = TrustCheckResult(True, score, "OK", "task_execute")
        self.assertTrue(result)
    
    def test_allowed_false(self):
        result = TrustCheckResult(False, None, "Blocked", "task_execute")
        self.assertFalse(result)


class TestMeeetTrustClient(unittest.TestCase):
    """Test MeeetTrustClient."""
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_get_trust_score_success(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "score": 0.85,
            "level": "high",
            "sara_risk": 0.2,
            "sara_level": "low",
            "gates_passed": 7,
            "gates_total": 7,
            "timestamp": "2024-01-01T00:00:00Z"
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        client = MeeetTrustClient(api_key="test_key")
        score = client.get_trust_score("did:meeet:test")
        
        self.assertEqual(score.score, 0.85)
        self.assertEqual(score.level, "high")
        self.assertEqual(score.sara_risk, 0.2)
        self.assertEqual(score.gates_passed, 7)
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_verify_agent_allowed(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "score": 0.85, "level": "high", "sara_risk": 0.2,
            "sara_level": "low", "gates_passed": 7, "gates_total": 7
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        client = MeeetTrustClient(api_key="test_key")
        result = client.verify_agent("did:meeet:test", min_trust=0.7, max_sara=0.6)
        
        self.assertTrue(result.allowed)
        self.assertEqual(result.trust_score.score, 0.85)
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_verify_agent_blocked_low_trust(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "score": 0.5, "level": "medium", "sara_risk": 0.2,
            "sara_level": "low", "gates_passed": 4, "gates_total": 7
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        client = MeeetTrustClient(api_key="test_key")
        result = client.verify_agent("did:meeet:test", min_trust=0.7, max_sara=0.6)
        
        self.assertFalse(result.allowed)
        self.assertIn("below minimum", result.reason)
    
    @patch('meeet_trust.client.urllib.request.urlopen')
    def test_verify_agent_blocked_high_sara(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "score": 0.85, "level": "high", "sara_risk": 0.8,
            "sara_level": "high", "gates_passed": 7, "gates_total": 7
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        client = MeeetTrustClient(api_key="test_key")
        result = client.verify_agent("did:meeet:test", min_trust=0.7, max_sara=0.6)
        
        self.assertFalse(result.allowed)
        self.assertIn("SARA risk", result.reason)


class TestMeeetGuard(unittest.TestCase):
    """Test MeeetGuard."""
    
    def test_init(self):
        guard = MeeetGuard(api_key="test_key", min_trust=0.8, max_sara=0.5)
        self.assertEqual(guard.min_trust, 0.8)
        self.assertEqual(guard.max_sara, 0.5)
    
    @patch('meeet_trust.client.MeeetTrustClient.verify_agent')
    def test_before_action_decorator_allowed(self, mock_verify):
        mock_result = MagicMock()
        mock_result.allowed = True
        mock_result.reason = "OK"
        mock_verify.return_value = mock_result
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(agent_did="did:meeet:test")
        def my_task():
            return "executed"
        
        result = my_task()
        self.assertEqual(result, "executed")
    
    @patch('meeet_trust.client.MeeetTrustClient.verify_agent')
    def test_before_action_decorator_blocked(self, mock_verify):
        mock_result = MagicMock()
        mock_result.allowed = False
        mock_result.reason = "Trust score too low"
        mock_verify.return_value = mock_result
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(agent_did="did:meeet:test")
        def my_task():
            return "executed"
        
        with self.assertRaises(MeeetTrustException) as ctx:
            my_task()
        self.assertIn("Trust check failed", str(ctx.exception))
    
    def test_crewai_hook(self):
        guard = MeeetGuard(api_key="test_key")
        hook = guard.crewai_hook(agent_did="did:meeet:test")
        self.assertTrue(callable(hook))
    
    def test_autogen_middleware(self):
        guard = MeeetGuard(api_key="test_key")
        middleware = guard.autogen_middleware(agent_did="did:meeet:test")
        self.assertTrue(callable(middleware))
    
    def test_langgraph_node(self):
        guard = MeeetGuard(api_key="test_key")
        node = guard.langgraph_node(agent_did="did:meeet:test")
        self.assertTrue(callable(node))


if __name__ == "__main__":
    unittest.main()
