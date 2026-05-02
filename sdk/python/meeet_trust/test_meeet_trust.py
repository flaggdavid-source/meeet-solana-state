"""
Unit tests for MEEET Trust Guard
"""

import unittest
from unittest.mock import patch, MagicMock
import json
import urllib.request

from meeet_trust import (
    MeeetGuard, 
    TrustCheckError, 
    TrustScoreTooLow, 
    SARARiskTooHigh
)
from meeet_trust.client import MeeetTrustClient, MeeetAPIError, TrustScore


class TestMeeetTrustClient(unittest.TestCase):
    """Test the MEEET Trust API client."""
    
    @patch('urllib.request.urlopen')
    def test_get_trust_score_success(self, mock_urlopen):
        """Test successful trust score retrieval."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent123",
            "score": 0.85,
            "level": "L4",
            "sara_risk": 0.15,
            "reputation": 500,
            "stake": 100,
            "verified": True,
            "gates_passed": {
                "L1_identity": True,
                "L2_authorization": True,
                "L3_audit": True,
            },
            "timestamp": "2024-01-01T00:00:00Z"
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        client = MeeetTrustClient(api_key="test_key")
        result = client.get_trust_score("did:meeet:agent123")
        
        self.assertEqual(result.agent_did, "did:meeet:agent123")
        self.assertEqual(result.score, 0.85)
        self.assertEqual(result.level, "L4")
        self.assertEqual(result.sara_risk, 0.15)
    
    @patch('urllib.request.urlopen')
    def test_check_trust_pass(self, mock_urlopen):
        """Test trust check that passes."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent123",
            "score": 0.85,
            "level": "L4",
            "sara_risk": 0.15,
            "gates_passed": {"L1": True},
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        client = MeeetTrustClient(api_key="test_key")
        result = client.check_trust("did:meeet:agent123", min_trust=0.5, max_sara_risk=0.6)
        
        self.assertTrue(result["passed"])
        self.assertEqual(result["trust_score"], 0.85)
        self.assertEqual(result["sara_risk"], 0.15)
    
    @patch('urllib.request.urlopen')
    def test_check_trust_fail_low_score(self, mock_urlopen):
        """Test trust check that fails due to low trust score."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent123",
            "score": 0.3,
            "level": "L1",
            "sara_risk": 0.1,
            "gates_passed": {},
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        client = MeeetTrustClient(api_key="test_key")
        result = client.check_trust("did:meeet:agent123", min_trust=0.5, max_sara_risk=0.6)
        
        self.assertFalse(result["passed"])
        self.assertEqual(result["trust_score"], 0.3)
    
    @patch('urllib.request.urlopen')
    def test_check_trust_fail_high_risk(self, mock_urlopen):
        """Test trust check that fails due to high SARA risk."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "agent_did": "did:meeet:agent123",
            "score": 0.8,
            "level": "L4",
            "sara_risk": 0.8,
            "gates_passed": {"L1": True},
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        client = MeeetTrustClient(api_key="test_key")
        result = client.check_trust("did:meeet:agent123", min_trust=0.5, max_sara_risk=0.6)
        
        self.assertFalse(result["passed"])
        self.assertEqual(result["sara_risk"], 0.8)


class TestMeeetGuard(unittest.TestCase):
    """Test the MeeetGuard class."""
    
    @patch('meeet_trust.client.MeeetTrustClient.check_trust')
    def test_check_trust_success(self, mock_check):
        """Test successful trust check."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "level": "L4",
            "passed": True,
            "gates_passed": {"L1": True},
        }
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.check_trust("did:meeet:agent123")
        
        self.assertTrue(result["passed"])
        self.assertEqual(result["trust_score"], 0.85)
    
    @patch('meeet_trust.client.MeeetTrustClient.check_trust')
    def test_check_trust_failure(self, mock_check):
        """Test failed trust check."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.3,
            "sara_risk": 0.7,
            "level": "L1",
            "passed": False,
            "gates_passed": {},
        }
        
        guard = MeeetGuard(api_key="test_key")
        result = guard.check_trust("did:meeet:agent123", min_trust=0.5, max_sara_risk=0.6)
        
        self.assertFalse(result["passed"])
    
    @patch('meeet_trust.client.MeeetTrustClient.check_trust')
    def test_before_action_decorator_pass(self, mock_check):
        """Test before_action decorator with passing trust check."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "level": "L4",
            "passed": True,
            "gates_passed": {"L1": True},
        }
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7, max_sara_risk=0.5)
        def my_task(agent_did):
            return "task_executed"
        
        result = my_task("did:meeet:agent123")
        self.assertEqual(result, "task_executed")
    
    @patch('meeet_trust.client.MeeetTrustClient.check_trust')
    def test_before_action_decorator_fail_block(self, mock_check):
        """Test before_action decorator that blocks on failure."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.3,
            "sara_risk": 0.7,
            "level": "L1",
            "passed": False,
            "gates_passed": {},
        }
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7, max_sara_risk=0.5, block_on_fail=True)
        def my_task(agent_did):
            return "task_executed"
        
        with self.assertRaises(TrustScoreTooLow):
            my_task("did:meeet:agent123")
    
    @patch('meeet_trust.client.MeeetTrustClient.check_trust')
    def test_before_action_decorator_fail_no_block(self, mock_check):
        """Test before_action decorator that doesn't block on failure."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.3,
            "sara_risk": 0.7,
            "level": "L1",
            "passed": False,
            "gates_passed": {},
        }
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7, max_sara_risk=0.5, block_on_fail=False)
        def my_task(agent_did):
            return "task_executed"
        
        result = my_task("did:meeet:agent123")
        self.assertIsNone(result)  # Returns None when blocked
    
    @patch('meeet_trust.client.MeeetTrustClient.check_trust')
    def test_before_action_sara_risk_fail(self, mock_check):
        """Test before_action decorator that fails due to SARA risk."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.8,
            "sara_risk": 0.8,
            "level": "L4",
            "passed": False,
            "gates_passed": {"L1": True},
        }
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7, max_sara_risk=0.5, block_on_fail=True)
        def my_task(agent_did):
            return "task_executed"
        
        with self.assertRaises(SARARiskTooHigh):
            my_task("did:meeet:agent123")
    
    def test_extract_agent_did_from_kwargs(self):
        """Test extracting agent_did from kwargs."""
        guard = MeeetGuard(api_key="test_key")
        
        # Test various key names
        for key in ["agent_did", "agent_id", "did", "agent"]:
            result = guard._extract_agent_did((), {key: "did:meeet:test123"})
            self.assertEqual(result, "did:meeet:test123")
    
    def test_extract_agent_did_from_args(self):
        """Test extracting agent_did from positional args."""
        guard = MeeetGuard(api_key="test_key")
        
        result = guard._extract_agent_did(("did:meeet:test123",), {})
        self.assertEqual(result, "did:meeet:test123")
    
    def test_extract_agent_did_not_found(self):
        """Test when agent_did is not found."""
        guard = MeeetGuard(api_key="test_key")
        
        result = guard._extract_agent_did(("other_arg",), {"other_key": "value"})
        self.assertIsNone(result)
    
    def test_clear_cache_specific(self):
        """Test clearing cache for specific agent."""
        guard = MeeetGuard(api_key="test_key")
        
        # Add to cache
        guard._verified_agents["did:meeet:agent1"] = TrustScore(
            agent_did="did:meeet:agent1",
            score=0.8,
            level="L4",
            sara_risk=0.1,
            reputation=100,
            stake=50,
            verified=True,
            gates_passed={},
            timestamp="",
        )
        guard._verified_agents["did:meeet:agent2"] = TrustScore(
            agent_did="did:meeet:agent2",
            score=0.7,
            level="L3",
            sara_risk=0.2,
            reputation=80,
            stake=40,
            verified=True,
            gates_passed={},
            timestamp="",
        )
        
        guard.clear_cache("did:meeet:agent1")
        
        self.assertNotIn("did:meeet:agent1", guard._verified_agents)
        self.assertIn("did:meeet:agent2", guard._verified_agents)
    
    def test_clear_cache_all(self):
        """Test clearing all cache."""
        guard = MeeetGuard(api_key="test_key")
        
        guard._verified_agents["did:meeet:agent1"] = TrustScore(
            agent_did="did:meeet:agent1",
            score=0.8,
            level="L4",
            sara_risk=0.1,
            reputation=100,
            stake=50,
            verified=True,
            gates_passed={},
            timestamp="",
        )
        
        guard.clear_cache()
        
        self.assertEqual(len(guard._verified_agents), 0)


class TestCrewAIHook(unittest.TestCase):
    """Test CrewAI integration."""
    
    @patch('meeet_trust.meeet_guard.MeeetGuard.check_trust')
    def test_crewai_hook_pass(self, mock_check):
        """Test CrewAI hook that passes."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "level": "L4",
            "passed": True,
            "gates_passed": {},
        }
        
        guard = MeeetGuard(api_key="test_key")
        hook = guard.crewai_hook(min_trust=0.7)
        
        # Mock task and agent
        mock_task = MagicMock()
        mock_agent = MagicMock()
        mock_agent.agent_did = "did:meeet:agent123"
        
        # Should not raise
        hook(mock_task, mock_agent)
    
    @patch('meeet_trust.meeet_guard.MeeetGuard.check_trust')
    def test_crewai_hook_fail(self, mock_check):
        """Test CrewAI hook that fails."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.3,
            "sara_risk": 0.7,
            "level": "L1",
            "passed": False,
            "gates_passed": {},
        }
        
        guard = MeeetGuard(api_key="test_key")
        hook = guard.crewai_hook(min_trust=0.7)
        
        mock_task = MagicMock()
        mock_agent = MagicMock()
        mock_agent.agent_did = "did:meeet:agent123"
        
        with self.assertRaises(TrustCheckError):
            hook(mock_task, mock_agent)


class TestAutoGenMiddleware(unittest.TestCase):
    """Test AutoGen integration."""
    
    @patch('meeet_trust.meeet_guard.MeeetGuard.check_trust')
    def test_autogen_middleware_pass(self, mock_check):
        """Test AutoGen middleware that passes."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "level": "L4",
            "passed": True,
            "gates_passed": {},
        }
        
        guard = MeeetGuard(api_key="test_key")
        middleware = guard.autogen_middleware(min_trust=0.7)
        
        mock_agent = MagicMock()
        mock_agent.agent_did = "did:meeet:agent123"
        
        result = middleware(mock_agent, "message", "sender")
        self.assertTrue(result)
    
    @patch('meeet_trust.meeet_guard.MeeetGuard.check_trust')
    def test_autogen_middleware_fail(self, mock_check):
        """Test AutoGen middleware that fails."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.3,
            "sara_risk": 0.7,
            "level": "L1",
            "passed": False,
            "gates_passed": {},
        }
        
        guard = MeeetGuard(api_key="test_key")
        middleware = guard.autogen_middleware(min_trust=0.7)
        
        mock_agent = MagicMock()
        mock_agent.agent_did = "did:meeet:agent123"
        
        result = middleware(mock_agent, "message", "sender")
        self.assertFalse(result)


class TestLangGraphNode(unittest.TestCase):
    """Test LangGraph integration."""
    
    @patch('meeet_trust.meeet_guard.MeeetGuard.check_trust')
    def test_langgraph_node_pass(self, mock_check):
        """Test LangGraph node that passes."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "level": "L4",
            "passed": True,
            "gates_passed": {"L1": True},
        }
        
        guard = MeeetGuard(api_key="test_key")
        node = guard.langgraph_node(min_trust=0.7)
        
        state = {"agent_did": "did:meeet:agent123", "other_data": "value"}
        result = node(state)
        
        self.assertTrue(result["trust_verified"])
        self.assertEqual(result["trust_score"], 0.85)
        self.assertEqual(result["sara_risk"], 0.15)
        self.assertIn("L1", result["trust_gates"])
    
    @patch('meeet_trust.meeet_guard.MeeetGuard.check_trust')
    def test_langgraph_node_fail(self, mock_check):
        """Test LangGraph node that fails."""
        mock_check.return_value = {
            "agent_did": "did:meeet:agent123",
            "trust_score": 0.3,
            "sara_risk": 0.7,
            "level": "L1",
            "passed": False,
            "gates_passed": {},
        }
        
        guard = MeeetGuard(api_key="test_key")
        node = guard.langgraph_node(min_trust=0.7)
        
        state = {"agent_did": "did:meeet:agent123"}
        result = node(state)
        
        self.assertFalse(result["trust_verified"])
    
    def test_langgraph_node_no_agent_did(self):
        """Test LangGraph node without agent_did."""
        guard = MeeetGuard(api_key="test_key")
        node = guard.langgraph_node(min_trust=0.7)
        
        state = {"other_data": "value"}
        result = node(state)
        
        self.assertFalse(result["trust_verified"])
        self.assertIn("No agent_did", result["trust_error"])


if __name__ == "__main__":
    unittest.main()
