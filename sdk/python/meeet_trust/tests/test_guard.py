"""Tests for MeeetGuard trust verification."""

import unittest
from unittest.mock import patch, MagicMock
import json

from meeet_trust import MeeetGuard, TrustCheckError, TrustBlockedError


class TestMeeetGuard(unittest.TestCase):
    """Test MeeetGuard class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.guard = MeeetGuard(
            api_key="test_key",
            default_min_trust=0.7,
            default_max_sara=0.6,
        )
    
    def test_init(self):
        """Test guard initialization."""
        self.assertEqual(self.guard.api_key, "test_key")
        self.assertEqual(self.guard.default_min_trust, 0.7)
        self.assertEqual(self.guard.default_max_sara, 0.6)
        self.assertEqual(self.guard.api_url, "https://meeet.world/api")
    
    def test_init_from_env(self):
        """Test initialization from environment variable."""
        with patch.dict('os.environ', {'MEEET_API_KEY': 'env_key'}):
            guard = MeeetGuard()
            self.assertEqual(guard.api_key, "env_key")
    
    @patch('meeet_trust.guard.urllib.request.urlopen')
    def test_check_trust_success(self, mock_urlopen):
        """Test successful trust check."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.3,
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = self.guard.check_trust("did:test:agent123", min_trust=0.7, max_sara=0.6)
        
        self.assertTrue(result["passed"])
        self.assertEqual(result["trust_score"], 0.8)
        self.assertEqual(result["sara_risk"], 0.3)
    
    @patch('meeet_trust.guard.urllib.request.urlopen')
    def test_check_trust_low_score(self, mock_urlopen):
        """Test trust check with low trust score."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.5,
            "sara_risk": 0.2,
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        with self.assertRaises(TrustBlockedError) as ctx:
            self.guard.check_trust("did:test:agent123", min_trust=0.7)
        
        self.assertEqual(ctx.exception.trust_score, 0.5)
    
    @patch('meeet_trust.guard.urllib.request.urlopen')
    def test_check_trust_high_sara(self, mock_urlopen):
        """Test trust check with high SARA risk."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.8,
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        with self.assertRaises(TrustBlockedError) as ctx:
            self.guard.check_trust("did:test:agent123", max_sara=0.6)
        
        self.assertEqual(ctx.exception.sara_risk, 0.8)
    
    @patch('meeet_trust.guard.urllib.request.urlopen')
    def test_check_trust_api_error(self, mock_urlopen):
        """Test trust check API error handling."""
        import urllib.error
        mock_urlopen.side_effect = urllib.error.HTTPError(
            "url", 401, "Unauthorized", {}, None
        )
        
        with self.assertRaises(TrustCheckError):
            self.guard.check_trust("did:test:agent123")
    
    def test_before_action_decorator(self):
        """Test before_action decorator."""
        @self.guard.before_action(min_trust=0.7)
        def test_task(agent_did):
            return "executed"
        
        with patch.object(self.guard, 'check_trust') as mock_check:
            mock_check.return_value = {"passed": True}
            result = test_task("did:test:agent123")
            
            self.assertEqual(result, "executed")
            mock_check.assert_called_once()
    
    def test_before_action_no_agent_did(self):
        """Test before_action with no agent_did."""
        @self.guard.before_action(min_trust=0.7)
        def test_task(agent_did):
            return "executed"
        
        result = test_task(None)
        self.assertEqual(result, "executed")
    
    def test_clear_cache(self):
        """Test cache clearing."""
        self.guard._cache["did:test:123"] = (0, {"trust_score": 0.8})
        self.guard.clear_cache()
        self.assertEqual(len(self.guard._cache), 0)
    
    def test_as_langgraph_node(self):
        """Test LangGraph node creation."""
        node = self.guard.as_langgraph_node("trust", min_trust=0.7)
        
        with patch.object(self.guard, 'check_trust') as mock_check:
            mock_check.return_value = {"passed": True}
            result = node({"agent_did": "did:test:agent123"})
            
            self.assertTrue(result["trust_passed"])
    
    def test_as_langgraph_node_no_agent(self):
        """Test LangGraph node with no agent_did."""
        node = self.guard.as_langgraph_node("trust")
        result = node({})
        self.assertEqual(result, {})


class TestConvenienceFunctions(unittest.TestCase):
    """Test convenience decorator functions."""
    
    def test_before_action(self):
        """Test before_action convenience function."""
        from meeet_trust import before_action
        
        @before_action(min_trust=0.7, api_key="test_key")
        def test_task(agent_did):
            return "executed"
        
        self.assertTrue(callable(test_task))


if __name__ == "__main__":
    unittest.main()
