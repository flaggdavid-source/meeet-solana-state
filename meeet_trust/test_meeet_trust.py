"""
Unit tests for meeet_trust package.
"""

import json
import unittest
from unittest.mock import patch, MagicMock
import urllib.error

from meeet_trust import (
    MeeetGuard,
    TrustScore,
    TrustResult,
    TrustAction,
    MeeetTrustError,
    MeeetTrustBlocked,
)


class TestTrustScore(unittest.TestCase):
    """Tests for TrustScore class."""
    
    def test_trust_score_creation(self):
        """Test creating a TrustScore object."""
        score = TrustScore(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.15,
        )
        self.assertEqual(score.agent_did, "did:meeet:agent123")
        self.assertEqual(score.trust_score, 0.85)
        self.assertEqual(score.sara_risk, 0.15)
    
    def test_trust_score_to_dict(self):
        """Test converting TrustScore to dictionary."""
        score = TrustScore(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.15,
            layers={"l1_identity": "verified"},
        )
        data = score.to_dict()
        self.assertEqual(data["agent_did"], "did:meeet:agent123")
        self.assertEqual(data["trust_score"], 0.85)
        self.assertEqual(data["sara_risk"], 0.15)
    
    def test_trust_score_repr(self):
        """Test string representation."""
        score = TrustScore(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.15,
        )
        repr_str = repr(score)
        self.assertIn("did:meeet:agent123", repr_str)
        self.assertIn("0.85", repr_str)


class TestMeeetGuardInitialization(unittest.TestCase):
    """Tests for MeeetGuard initialization."""
    
    def test_default_initialization(self):
        """Test default initialization."""
        guard = MeeetGuard(api_key="test_key")
        self.assertEqual(guard.api_key, "test_key")
        self.assertEqual(guard.base_url, "https://meeet.world/api")
        self.assertEqual(guard.default_min_trust, 0.5)
        self.assertEqual(guard.default_sara_threshold, 0.6)
        self.assertFalse(guard.fail_open)
    
    def test_custom_initialization(self):
        """Test custom initialization."""
        guard = MeeetGuard(
            api_key="test_key",
            base_url="https://custom.api.com",
            default_min_trust=0.7,
            default_sara_threshold=0.8,
            cache_ttl_seconds=600,
            fail_open=True,
        )
        self.assertEqual(guard.base_url, "https://custom.api.com")
        self.assertEqual(guard.default_min_trust, 0.7)
        self.assertEqual(guard.default_sara_threshold, 0.8)
        self.assertTrue(guard.fail_open)


class TestGetTrustScore(unittest.TestCase):
    """Tests for get_trust_score method."""
    
    @patch("urllib.request.urlopen")
    def test_get_trust_score_success(self, mock_urlopen):
        """Test successful trust score fetch."""
        # Mock API response
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "layers": {"l1_identity": "verified"},
            "timestamp": "2024-01-15T12:00:00Z",
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        guard = MeeetGuard(api_key="test_key")
        score = guard.get_trust_score("did:meeet:agent123")
        
        self.assertEqual(score.trust_score, 0.85)
        self.assertEqual(score.sara_risk, 0.15)
    
    @patch("urllib.request.urlopen")
    def test_get_trust_score_cached(self, mock_urlopen):
        """Test cache returns cached result."""
        guard = MeeetGuard(api_key="test_key", cache_ttl_seconds=300)
        
        # First call - fetch from "API"
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "layers": {},
            "timestamp": "2024-01-15T12:00:00Z",
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        score1 = guard.get_trust_score("did:meeet:agent123")
        score2 = guard.get_trust_score("did:meeet:agent123")
        
        # Second call should use cache
        self.assertEqual(score1.trust_score, score2.trust_score)
        self.assertEqual(mock_urlopen.call_count, 1)
    
    @patch("urllib.request.urlopen")
    def test_get_trust_score_force_refresh(self, mock_urlopen):
        """Test force refresh bypasses cache."""
        guard = MeeetGuard(api_key="test_key")
        
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "layers": {},
            "timestamp": "2024-01-15T12:00:00Z",
        }).encode()
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        
        # First call
        guard.get_trust_score("did:meeet:agent123")
        # Force refresh
        guard.get_trust_score("did:meeet:agent123", force_refresh=True)
        
        # Should have called API twice
        self.assertEqual(mock_urlopen.call_count, 2)
    
    @patch("urllib.request.urlopen")
    def test_get_trust_score_http_error(self, mock_urlopen):
        """Test HTTP error handling."""
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://test.com",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=None,
        )
        
        guard = MeeetGuard(api_key="test_key", fail_open=False)
        
        with self.assertRaises(MeeetTrustError) as context:
            guard.get_trust_score("did:meeet:agent123")
        
        self.assertIn("401", str(context.exception))
    
    @patch("urllib.request.urlopen")
    def test_get_trust_score_fail_open(self, mock_urlopen):
        """Test fail_open mode on HTTP error."""
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://test.com",
            code=500,
            msg="Internal Error",
            hdrs={},
            fp=None,
        )
        
        guard = MeeetGuard(api_key="test_key", fail_open=True)
        score = guard.get_trust_score("did:meeet:agent123")
        
        # Should return default score
        self.assertEqual(score.trust_score, 1.0)
        self.assertEqual(score.sara_risk, 0.0)


class TestVerifyTrust(unittest.TestCase):
    """Tests for verify_trust method."""
    
    @patch("meeet_trust.MeeetGuard.get_trust_score")
    def test_verify_trust_allowed(self, mock_get_score):
        """Test trust verification allowed."""
        mock_get_score.return_value = TrustScore(
            agent_did="did:meeet:agent123",
            trust_score=0.85,
            sara_risk=0.15,
        )
        
        guard = MeeetGuard(api_key="test_key", default_min_trust=0.7)
        result, score, reason = guard.verify_trust("did:meeet:agent123")
        
        self.assertEqual(result, TrustResult.ALLOWED)
        self.assertEqual(score.trust_score, 0.85)
    
    @patch("meeet_trust.MeeetGuard.get_trust_score")
    def test_verify_trust_blocked_low_score(self, mock_get_score):
        """Test blocked due to low trust score."""
        mock_get_score.return_value = TrustScore(
            agent_did="did:meeet:agent123",
            trust_score=0.5,
            sara_risk=0.1,
        )
        
        guard = MeeetGuard(api_key="test_key", default_min_trust=0.7)
        result, score, reason = guard.verify_trust("did:meeet:agent123")
        
        self.assertEqual(result, TrustResult.BLOCKED)
        self.assertIn("0.5", reason)
    
    @patch("meeet_trust.MeeetGuard.get_trust_score")
    def test_verify_trust_blocked_high_sara(self, mock_get_score):
        """Test blocked due to high SARA risk."""
        mock_get_score.return_value = TrustScore(
            agent_did="did:meeet:agent123",
            trust_score=0.9,
            sara_risk=0.85,
        )
        
        guard = MeeetGuard(api_key="test_key", default_sara_threshold=0.6)
        result, score, reason = guard.verify_trust("did:meeet:agent123")
        
        self.assertEqual(result, TrustResult.BLOCKED)
        self.assertIn("0.85", reason)
    
    @patch("meeet_trust.MeeetGuard.get_trust_score")
    def test_verify_trust_warned_sara(self, mock_get_score):
        """Test warned due to moderate SARA risk."""
        mock_get_score.return_value = TrustScore(
            agent_did="did:meeet:agent123",
            trust_score=0.9,
            sara_risk=0.7,  # In warning zone
        )
        
        guard = MeeetGuard(api_key="test_key", default_sara_threshold=0.6)
        result, score, reason = guard.verify_trust("did:meeet:agent123")
        
        self.assertEqual(result, TrustResult.WARNED)


class TestExtractAgentDid(unittest.TestCase):
    """Tests for _extract_agent_did method."""
    
    def test_extract_from_string(self):
        """Test extracting DID from string."""
        guard = MeeetGuard(api_key="test_key")
        did = guard._extract_agent_did("did:meeet:agent123")
        self.assertEqual(did, "did:meeet:agent123")
    
    def test_extract_from_dict(self):
        """Test extracting DID from dict."""
        guard = MeeetGuard(api_key="test_key")
        did = guard._extract_agent_did({"agent_did": "did:meeet:agent123"})
        self.assertEqual(did, "did:meeet:agent123")
    
    def test_extract_from_dict_with_did(self):
        """Test extracting DID from dict with 'did' key."""
        guard = MeeetGuard(api_key="test_key")
        did = guard._extract_agent_did({"did": "did:meeet:agent456"})
        self.assertEqual(did, "did:meeet:agent456")
    
    def test_extract_from_object(self):
        """Test extracting DID from object with agent_id."""
        guard = MeeetGuard(api_key="test_key")
        
        class MockAgent:
            agent_id = "did:meeet:agent789"
        
        did = guard._extract_agent_did(MockAgent())
        self.assertEqual(did, "did:meeet:agent789")
    
    def test_extract_none_from_none(self):
        """Test extracting from None."""
        guard = MeeetGuard(api_key="test_key")
        did = guard._extract_agent_did(None)
        self.assertIsNone(did)


class TestBeforeActionDecorator(unittest.TestCase):
    """Tests for before_action decorator."""
    
    @patch("meeet_trust.MeeetGuard.verify_trust")
    def test_decorator_allows(self, mock_verify):
        """Test decorator allows action."""
        mock_verify.return_value = (
            TrustResult.ALLOWED,
            TrustScore("did:meeet:agent123", 0.85, 0.15),
            "Allowed",
        )
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did):
            return {"status": "success"}
        
        result = my_task("did:meeet:agent123")
        self.assertEqual(result["status"], "success")
    
    @patch("meeet_trust.MeeetGuard.verify_trust")
    def test_decorator_blocks(self, mock_verify):
        """Test decorator blocks action."""
        mock_verify.return_value = (
            TrustResult.BLOCKED,
            TrustScore("did:meeet:agent123", 0.5, 0.1),
            "Trust score too low",
        )
        
        guard = MeeetGuard(api_key="test_key")
        
        @guard.before_action(min_trust=0.7)
        def my_task(agent_did):
            return {"status": "success"}
        
        with self.assertRaises(MeeetTrustBlocked):
            my_task("did:meeet:agent123")


class TestLangGraphNode(unittest.TestCase):
    """Tests for langgraph_node method."""
    
    @patch("meeet_trust.MeeetGuard.verify_trust")
    def test_langgraph_node_allowed(self, mock_verify):
        """Test LangGraph node allows action."""
        mock_verify.return_value = (
            TrustResult.ALLOWED,
            TrustScore("did:meeet:agent123", 0.85, 0.15),
            "Allowed",
        )
        
        guard = MeeetGuard(api_key="test_key")
        state = {"agent_did": "did:meeet:agent123", "task": "research"}
        
        result = guard.langgraph_node(state, min_trust=0.7)
        
        self.assertTrue(result["trust_verified"])
        self.assertEqual(result["trust_result"], "allowed")
    
    @patch("meeet_trust.MeeetGuard.verify_trust")
    def test_langgraph_node_blocked(self, mock_verify):
        """Test LangGraph node blocks action."""
        mock_verify.return_value = (
            TrustResult.BLOCKED,
            TrustScore("did:meeet:agent123", 0.5, 0.1),
            "Trust score too low",
        )
        
        guard = MeeetGuard(api_key="test_key")
        state = {"agent_did": "did:meeet:agent123", "task": "research"}
        
        result = guard.langgraph_node(state, min_trust=0.7)
        
        self.assertFalse(result["trust_verified"])
        self.assertIn("trust_error", result)


class TestCrewAIAndAutoGen(unittest.TestCase):
    """Tests for CrewAI and AutoGen hooks."""
    
    @patch("meeet_trust.MeeetGuard.verify_trust")
    def test_crewai_hook(self, mock_verify):
        """Test CrewAI hook integration."""
        mock_verify.return_value = (
            TrustResult.ALLOWED,
            TrustScore("did:meeet:agent123", 0.85, 0.15),
            "Allowed",
        )
        
        guard = MeeetGuard(api_key="test_key")
        
        class MockCrewAIAgent:
            agent_id = "did:meeet:agent123"
        
        result = guard.crewai_hook(MockCrewAIAgent(), min_trust=0.7)
        self.assertTrue(result)
    
    @patch("meeet_trust.MeeetGuard.verify_trust")
    def test_crewai_hook_blocked(self, mock_verify):
        """Test CrewAI hook blocks."""
        mock_verify.return_value = (
            TrustResult.BLOCKED,
            TrustScore("did:meeet:agent123", 0.5, 0.1),
            "Trust score too low",
        )
        
        guard = MeeetGuard(api_key="test_key")
        
        class MockCrewAIAgent:
            agent_id = "did:meeet:agent123"
        
        result = guard.crewai_hook(MockCrewAIAgent(), min_trust=0.7)
        self.assertFalse(result)
    
    @patch("meeet_trust.MeeetGuard.verify_trust")
    def test_autogen_middleware(self, mock_verify):
        """Test AutoGen middleware."""
        mock_verify.return_value = (
            TrustResult.ALLOWED,
            TrustScore("did:meeet:agent123", 0.85, 0.15),
            "Allowed",
        )
        
        guard = MeeetGuard(api_key="test_key")
        
        class MockAutoGenAgent:
            agent_id = "did:meeet:agent123"
        
        result = guard.autogen_middleware(MockAutoGenAgent(), "tool_name")
        
        self.assertTrue(result["allowed"])
        self.assertIn("trust_score", result)


class TestCache(unittest.TestCase):
    """Tests for caching functionality."""
    
    def test_clear_cache(self):
        """Test clearing cache."""
        guard = MeeetGuard(api_key="test_key")
        guard._cache["test_key"] = (TrustScore("did:meeet:agent", 0.85, 0.15), None)
        
        guard.clear_cache()
        
        self.assertEqual(len(guard._cache), 0)
    
    def test_get_cached_agents(self):
        """Test getting cached agents."""
        guard = MeeetGuard(api_key="test_key")
        guard._cache["key1"] = (TrustScore("did:meeet:agent1", 0.85, 0.15), None)
        guard._cache["key2"] = (TrustScore("did:meeet:agent2", 0.9, 0.1), None)
        
        cached = guard.get_cached_agents()
        
        self.assertEqual(len(cached), 2)


if __name__ == "__main__":
    unittest.main()