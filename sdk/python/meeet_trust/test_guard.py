"""Tests for MeeetGuard trust verification."""

import json
import unittest
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, './sdk/python')

from meeet_trust.guard import (
    MeeetGuard,
    TrustVerificationError,
    TrustScoreTooLow,
    SaraRiskTooHigh,
    TrustResponse,
)


class TestTrustResponse(unittest.TestCase):
    """Test TrustResponse parsing."""
    
    def test_parse_response(self):
        data = {
            "trust_score": 0.85,
            "sara_risk": 0.2,
            "agent_did": "did:meeet:agent123",
            "verified": True,
            "gates_passed": ["L1", "L2", "L3"],
            "gates_failed": [],
            "message": "All gates passed"
        }
        response = TrustResponse(data)
        
        self.assertEqual(response.trust_score, 0.85)
        self.assertEqual(response.sara_risk, 0.2)
        self.assertEqual(response.agent_did, "did:meeet:agent123")
        self.assertEqual(response.verified, True)
        self.assertEqual(response.gates_passed, ["L1", "L2", "L3"])
        self.assertEqual(response.gates_failed, [])


class TestMeeetGuard(unittest.TestCase):
    """Test MeeetGuard functionality."""
    
    def setUp(self):
        self.guard = MeeetGuard(
            api_key="test_api_key",
            default_min_trust=0.7,
            default_max_risk=0.6
        )
    
    @patch('meeet_trust.guard.urllib.request.urlopen')
    def test_verify_success(self, mock_urlopen):
        """Test successful trust verification."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.85,
            "sara_risk": 0.2,
            "agent_did": "did:meeet:agent123",
            "verified": True,
            "gates_passed": ["L1", "L2", "L3"],
            "gates_failed": []
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        response = self.guard.verify("did:meeet:agent123")
        
        self.assertEqual(response.trust_score, 0.85)
        self.assertEqual(response.sara_risk, 0.2)
    
    @patch('meeet_trust.guard.urllib.request.urlopen')
    def test_verify_trust_too_low(self, mock_urlopen):
        """Test trust score below threshold raises exception."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.5,
            "sara_risk": 0.2,
            "agent_did": "did:meeet:agent123",
            "verified": False,
            "gates_passed": ["L1"],
            "gates_failed": ["L2", "L3"]
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        with self.assertRaises(TrustScoreTooLow) as ctx:
            self.guard.verify("did:meeet:agent123", min_trust=0.7)
        
        self.assertEqual(ctx.exception.trust_score, 0.5)
        self.assertEqual(ctx.exception.min_trust, 0.7)
    
    @patch('meeet_trust.guard.urllib.request.urlopen')
    def test_verify_sara_risk_too_high(self, mock_urlopen):
        """Test SARA risk above threshold raises exception."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.9,
            "sara_risk": 0.8,
            "agent_did": "did:meeet:agent123",
            "verified": True,
            "gates_passed": ["L1", "L2", "L3"],
            "gates_failed": []
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        with self.assertRaises(SaraRiskTooHigh) as ctx:
            self.guard.verify("did:meeet:agent123", max_risk=0.6)
        
        self.assertEqual(ctx.exception.sara_risk, 0.8)
        self.assertEqual(ctx.exception.max_risk, 0.6)
    
    @patch('meeet_trust.guard.urllib.request.urlopen')
    def test_verify_block_on_fail_false(self, mock_urlopen):
        """Test that block_on_fail=False returns response even on failure."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.5,
            "sara_risk": 0.2,
            "agent_did": "did:meeet:agent123",
            "verified": False,
            "gates_passed": ["L1"],
            "gates_failed": ["L2"]
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        response = self.guard.verify(
            "did:meeet:agent123",
            min_trust=0.7,
            block_on_fail=False
        )
        
        self.assertEqual(response.trust_score, 0.5)


class TestBeforeActionDecorator(unittest.TestCase):
    """Test before_action decorator."""
    
    def setUp(self):
        self.guard = MeeetGuard(
            api_key="test_api_key",
            default_min_trust=0.7,
            default_max_risk=0.6
        )
    
    @patch('meeet_trust.guard.MeeetGuard.verify')
    def test_decorator_calls_verify(self, mock_verify):
        """Test decorator calls verify before executing function."""
        mock_verify.return_value = TrustResponse({
            "trust_score": 0.85,
            "sara_risk": 0.2,
            "agent_did": "did:meeet:agent123",
            "verified": True,
            "gates_passed": [],
            "gates_failed": []
        })
        
        @self.guard.before_action(min_trust=0.7)
        def my_task(agent_did: str, data: str):
            return f"Task executed with {data}"
        
        result = my_task("did:meeet:agent123", "test data")
        
        mock_verify.assert_called_once()
        self.assertEqual(result, "Task executed with test data")
    
    def test_decorator_raises_on_missing_agent_did(self):
        """Test decorator raises error when agent_did not provided."""
        @self.guard.before_action(min_trust=0.7)
        def my_task(agent_did: str, data: str):
            return "Task executed"
        
        with self.assertRaises(TrustVerificationError):
            my_task(data="test")  # Missing agent_did


class TestCrewAIHook(unittest.TestCase):
    """Test CrewAI integration."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_api_key")
    
    @patch('meeet_trust.guard.MeeetGuard.verify')
    def test_crewai_hook(self, mock_verify):
        """Test CrewAI before_task hook."""
        mock_verify.return_value = TrustResponse({
            "trust_score": 0.85,
            "sara_risk": 0.2,
            "agent_did": "did:meeet:agent123",
            "verified": True,
            "gates_passed": [],
            "gates_failed": []
        })
        
        hook = self.guard.crewai_before_task(min_trust=0.7)
        
        # Create mock task with mock agent
        mock_task = MagicMock()
        mock_agent = MagicMock()
        mock_agent.agent_did = "did:meeet:agent123"
        mock_task.agent = mock_agent
        
        result = hook(mock_task)
        
        mock_verify.assert_called_once()
        self.assertEqual(result, mock_task)


class TestAutoGenMiddleware(unittest.TestCase):
    """Test AutoGen integration."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_api_key")
    
    @patch('meeet_trust.guard.MeeetGuard.verify')
    def test_autogen_middleware(self, mock_verify):
        """Test AutoGen middleware."""
        mock_verify.return_value = TrustResponse({
            "trust_score": 0.85,
            "sara_risk": 0.2,
            "agent_did": "did:meeet:agent123",
            "verified": True,
            "gates_passed": [],
            "gates_failed": []
        })
        
        middleware = self.guard.autogen_middleware(min_trust=0.7)
        
        # Create mock agent
        mock_agent = MagicMock()
        mock_agent.agent_did = "did:meeet:agent123"
        
        result = middleware(mock_agent, "message", "sender")
        
        mock_verify.assert_called_once()
        self.assertIsNone(result)


class TestLangGraphNode(unittest.TestCase):
    """Test LangGraph integration."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_api_key")
    
    @patch('meeet_trust.guard.MeeetGuard.verify')
    def test_langgraph_node(self, mock_verify):
        """Test LangGraph node."""
        mock_verify.return_value = TrustResponse({
            "trust_score": 0.85,
            "sara_risk": 0.2,
            "agent_did": "did:meeet:agent123",
            "verified": True,
            "gates_passed": [],
            "gates_failed": []
        })
        
        node = self.guard.langgraph_node(min_trust=0.7)
        
        state = {"agent_did": "did:meeet:agent123", "task": "research"}
        result = node(state)
        
        mock_verify.assert_called_once()
        self.assertTrue(result["trust_verified"])


if __name__ == "__main__":
    unittest.main()
