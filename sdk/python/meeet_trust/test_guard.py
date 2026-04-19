"""
Unit tests for MeeetGuard trust verification.

These tests use mocked API responses to test the trust verification logic.
"""

import json
import unittest
from unittest.mock import patch, MagicMock
from io import BytesIO

from guard import (
    MeeetGuard,
    TrustVerificationError,
    TrustScoreTooLow,
    SARARiskTooHigh,
    quick_verify,
)


class TestMeeetGuard(unittest.TestCase):
    """Test cases for MeeetGuard class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.api_key = "test_api_key"
        self.agent_did = "did:meeet:test123"
        self.guard = MeeetGuard(
            api_key=self.api_key,
            min_trust=0.5,
            max_sara_risk=0.6,
        )
    
    def _mock_response(self, data: dict, status_code: int = 200):
        """Create a mock HTTP response."""
        response = MagicMock()
        response.read.return_value = json.dumps(data).encode()
        response.__enter__ = MagicMock(return_value=response)
        response.__exit__ = MagicMock(return_value=False)
        return response
    
    @patch("guard.urllib.request.urlopen")
    def test_verify_allowed(self, mock_urlopen):
        """Test verification passes for trusted agent."""
        mock_urlopen.return_value = self._mock_response({
            "trust_score": 0.8,
            "sara_risk": 0.2,
            "agent_did": self.agent_did,
        })
        
        result = self.guard.verify(self.agent_did)
        
        self.assertTrue(result["allowed"])
        self.assertEqual(result["trust_score"], 0.8)
        self.assertEqual(result["sara_risk"], 0.2)
        self.assertEqual(result["agent_did"], self.agent_did)
    
    @patch("guard.urllib.request.urlopen")
    def test_verify_trust_too_low(self, mock_urlopen):
        """Test verification fails when trust score is too low."""
        mock_urlopen.return_value = self._mock_response({
            "trust_score": 0.3,
            "sara_risk": 0.1,
            "agent_did": self.agent_did,
        })
        
        with self.assertRaises(TrustScoreTooLow) as ctx:
            self.guard.verify(self.agent_did)
        
        self.assertEqual(ctx.exception.trust_score, 0.3)
        self.assertEqual(ctx.exception.min_trust, 0.5)
    
    @patch("guard.urllib.request.urlopen")
    def test_verify_sara_risk_too_high(self, mock_urlopen):
        """Test verification fails when SARA risk is too high."""
        mock_urlopen.return_value = self._mock_response({
            "trust_score": 0.8,
            "sara_risk": 0.8,
            "agent_did": self.agent_did,
        })
        
        with self.assertRaises(SARARiskTooHigh) as ctx:
            self.guard.verify(self.agent_did)
        
        self.assertEqual(ctx.exception.sara_risk, 0.8)
        self.assertEqual(ctx.exception.max_risk, 0.6)
    
    @patch("guard.urllib.request.urlopen")
    def test_verify_api_error(self, mock_urlopen):
        """Test verification handles API errors."""
        import urllib.error
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://test",
            code=500,
            msg="Internal Server Error",
            hdrs={},
            fp=None,
        )
        
        with self.assertRaises(TrustVerificationError):
            self.guard.verify(self.agent_did)
    
    @patch("guard.urllib.request.urlopen")
    def test_before_action_decorator(self, mock_urlopen):
        """Test before_action decorator."""
        mock_urlopen.return_value = self._mock_response({
            "trust_score": 0.9,
            "sara_risk": 0.1,
            "agent_did": self.agent_did,
        })
        
        guard = MeeetGuard(api_key=self.api_key, min_trust=0.7)
        
        @guard.before_action()
        def my_task(agent_did):
            return f"Task executed for {agent_did}"
        
        result = my_task(self.agent_did)
        self.assertEqual(result, f"Task executed for {self.agent_did}")
    
    @patch("guard.urllib.request.urlopen")
    def test_before_action_decorator_blocks_low_trust(self, mock_urlopen):
        """Test before_action decorator blocks low trust."""
        mock_urlopen.return_value = self._mock_response({
            "trust_score": 0.6,
            "sara_risk": 0.1,
            "agent_did": self.agent_did,
        })
        
        guard = MeeetGuard(api_key=self.api_key, min_trust=0.7)
        
        @guard.before_action()
        def my_task(agent_did):
            return f"Task executed for {agent_did}"
        
        with self.assertRaises(TrustScoreTooLow):
            my_task(self.agent_did)
    
    def test_crewai_before_task_hook(self):
        """Test CrewAI before_task hook."""
        guard = MeeetGuard(api_key=self.api_key, min_trust=0.7)
        
        with patch.object(guard, "verify") as mock_verify:
            hook = guard.crewai_before_task()
            
            # Create mock task
            mock_task = MagicMock()
            mock_task.agent_did = self.agent_did
            
            hook(mock_task)
            
            mock_verify.assert_called_once_with(self.agent_did)
    
    def test_autogen_middleware(self):
        """Test AutoGen middleware."""
        guard = MeeetGuard(api_key=self.api_key, min_trust=0.7)
        
        with patch.object(guard, "verify") as mock_verify:
            middleware = guard.autogen_middleware()
            
            # Create mock agent
            mock_agent = MagicMock()
            mock_agent.agent_did = self.agent_did
            
            result = middleware(mock_agent, {}, {})
            
            self.assertTrue(result)
            mock_verify.assert_called_once_with(self.agent_did)
    
    @patch("guard.urllib.request.urlopen")
    def test_langgraph_node(self, mock_urlopen):
        """Test LangGraph node."""
        mock_urlopen.return_value = self._mock_response({
            "trust_score": 0.8,
            "sara_risk": 0.2,
            "agent_did": self.agent_did,
        })
        
        guard = MeeetGuard(api_key=self.api_key, min_trust=0.7)
        node = guard.langgraph_node("trust_check")
        
        state = {"agent_did": self.agent_did, "task": "research"}
        result = node(state)
        
        self.assertTrue(result["trust_verified"])
        self.assertEqual(result["agent_did"], self.agent_did)
    
    @patch("guard.urllib.request.urlopen")
    def test_quick_verify_allowed(self, mock_urlopen):
        """Test quick_verify function for allowed agent."""
        mock_urlopen.return_value = self._mock_response({
            "trust_score": 0.8,
            "sara_risk": 0.2,
            "agent_did": self.agent_did,
        })
        
        result = quick_verify(self.agent_did, self.api_key, min_trust=0.5)
        
        self.assertTrue(result["allowed"])
        self.assertEqual(result["trust_score"], 0.8)
    
    @patch("guard.urllib.request.urlopen")
    def test_quick_verify_blocked(self, mock_urlopen):
        """Test quick_verify function for blocked agent."""
        mock_urlopen.return_value = self._mock_response({
            "trust_score": 0.3,
            "sara_risk": 0.1,
            "agent_did": self.agent_did,
        })
        
        result = quick_verify(self.agent_did, self.api_key, min_trust=0.5)
        
        self.assertFalse(result["allowed"])
        self.assertIn("reason", result)


if __name__ == "__main__":
    unittest.main()
