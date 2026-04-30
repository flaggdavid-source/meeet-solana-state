"""
Unit tests for meeet-trust package.
"""

import json
import unittest
from unittest.mock import MagicMock, patch

import meeet_trust


class TestMeeetGuard(unittest.TestCase):
    """Test cases for MeeetGuard class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.api_key = "test_api_key"
        self.guard = meeet_trust.MeeetGuard(
            api_key=self.api_key,
            default_min_trust=0.5,
            default_max_sara_risk=0.6
        )
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_verify_trust_pass(self, mock_urlopen):
        """Test successful trust verification."""
        # Mock API response
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.2,
            "status": "verified"
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = self.guard.verify(
            agent_did="did:meeet:test123",
            min_trust=0.5,
            max_sara_risk=0.6,
            block_on_failure=False
        )
        
        self.assertTrue(result["passed"])
        self.assertEqual(result["trust_score"], 0.8)
        self.assertEqual(result["sara_risk"], 0.2)
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_verify_trust_score_too_low(self, mock_urlopen):
        """Test trust score below threshold."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.3,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = self.guard.verify(
            agent_did="did:meeet:test123",
            min_trust=0.5,
            max_sara_risk=0.6,
            block_on_failure=False
        )
        
        self.assertFalse(result["passed"])
        self.assertIn("trust_score_too_low", result["reason"])
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_verify_sara_risk_too_high(self, mock_urlopen):
        """Test SARA risk above threshold."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.8
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = self.guard.verify(
            agent_did="did:meeet:test123",
            min_trust=0.5,
            max_sara_risk=0.6,
            block_on_failure=False
        )
        
        self.assertFalse(result["passed"])
        self.assertIn("sara_risk_too_high", result["reason"])
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_verify_block_on_failure_raises(self, mock_urlopen):
        """Test exception raised when block_on_failure=True."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.3,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        with self.assertRaises(meeet_trust.TrustScoreTooLow):
            self.guard.verify(
                agent_did="did:meeet:test123",
                min_trust=0.5,
                max_sara_risk=0.6,
                block_on_failure=True
            )
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_verify_unknown_agent(self, mock_urlopen):
        """Test handling of unknown agent (404 response)."""
        import urllib.error
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="",
            code=404,
            msg="Not Found",
            hdrs={},
            fp=None
        )
        
        result = self.guard.verify(
            agent_did="did:meeet:unknown",
            min_trust=0.5,
            max_sara_risk=0.6,
            block_on_failure=False
        )
        
        self.assertFalse(result["passed"])
        self.assertEqual(result["trust_score"], 0.0)
        self.assertEqual(result["sara_risk"], 1.0)
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_before_action_decorator_pass(self, mock_urlopen):
        """Test before_action decorator allows execution."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        @self.guard.before_action(min_trust=0.5, max_sara_risk=0.6)
        def my_task(agent_did):
            return {"executed": True}
        
        result = my_task(agent_did="did:meeet:test123")
        
        self.assertTrue(result["executed"])
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_before_action_decorator_block(self, mock_urlopen):
        """Test before_action decorator blocks execution."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.3,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        @self.guard.before_action(min_trust=0.5, max_sara_risk=0.6)
        def my_task(agent_did):
            return {"executed": True}
        
        result = my_task(agent_did="did:meeet:test123")
        
        self.assertTrue(result["blocked"])
        self.assertIn("reason", result)
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_crewai_before_task(self, mock_urlopen):
        """Test CrewAI before_task hook."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        hook = self.guard.crewai_before_task("did:meeet:test123")
        result = hook()
        
        self.assertTrue(result["passed"])
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_autogen_middleware(self, mock_urlopen):
        """Test AutoGen middleware."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        middleware = self.guard.autogen_middleware("did:meeet:test123")
        result = middleware({"text": "Hello"})
        
        self.assertFalse(result["blocked"])
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_autogen_middleware_blocked(self, mock_urlopen):
        """Test AutoGen middleware blocks."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.3,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        middleware = self.guard.autogen_middleware("did:meeet:test123")
        result = middleware({"text": "Hello"})
        
        self.assertTrue(result["blocked"])
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_langgraph_node(self, mock_urlopen):
        """Test LangGraph node."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        node_func = self.guard.langgraph_node(state_key="agent_did")
        state = {"agent_did": "did:meeet:test123", "task": "research"}
        result = node_func(state)
        
        self.assertTrue(result["trust_verified"])
        self.assertFalse(result["blocked"])
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_langgraph_node_blocked(self, mock_urlopen):
        """Test LangGraph node blocks."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.3,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        node_func = self.guard.langgraph_node(state_key="agent_did")
        state = {"agent_did": "did:meeet:test123", "task": "research"}
        result = node_func(state)
        
        self.assertFalse(result["trust_verified"])
        self.assertTrue(result["blocked"])
    
    @patch("meeet_trust.urllib.request.urlopen")
    def test_quick_verify(self, mock_urlopen):
        """Test quick_verify convenience function."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.2
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = meeet_trust.quick_verify(
            agent_did="did:meeet:test123",
            api_key="test_key",
            min_trust=0.5,
            max_sara_risk=0.6
        )
        
        self.assertTrue(result["passed"])


class TestExceptions(unittest.TestCase):
    """Test custom exceptions."""
    
    def test_trust_score_too_low(self):
        """Test TrustScoreTooLow exception."""
        exc = meeet_trust.TrustScoreTooLow("did:meeet:test", 0.3, 0.5)
        self.assertIn("0.3", str(exc))
        self.assertIn("0.5", str(exc))
        self.assertEqual(exc.agent_did, "did:meeet:test")
        self.assertEqual(exc.trust_score, 0.3)
        self.assertEqual(exc.threshold, 0.5)
    
    def test_sara_risk_too_high(self):
        """Test SARARiskTooHigh exception."""
        exc = meeet_trust.SARARiskTooHigh("did:meeet:test", 0.8, 0.6)
        self.assertIn("0.8", str(exc))
        self.assertIn("0.6", str(exc))
        self.assertEqual(exc.agent_did, "did:meeet:test")
        self.assertEqual(exc.risk_score, 0.8)
        self.assertEqual(exc.threshold, 0.6)


if __name__ == "__main__":
    unittest.main()
