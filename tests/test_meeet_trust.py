"""
Unit tests for MEEET Trust Guard package.
"""

import json
import unittest
from unittest.mock import patch, MagicMock
from meeet_trust import MeeetGuard, TrustResult, TrustCheckError


class TestTrustResult(unittest.TestCase):
    """Tests for TrustResult dataclass."""
    
    def test_trust_result_creation(self):
        """Test TrustResult creation."""
        result = TrustResult(
            agent_did="did:meeet:agent123",
            trust_score=0.8,
            sara_risk=0.2,
        )
        self.assertEqual(result.agent_did, "did:meeet:agent123")
        self.assertEqual(result.trust_score, 0.8)
        self.assertEqual(result.sara_risk, 0.2)
        self.assertTrue(result.passed)
    
    def test_trust_result_repr(self):
        """Test TrustResult string representation."""
        result = TrustResult(
            agent_did="did:meeet:agent123",
            trust_score=0.8,
            sara_risk=0.2,
        )
        self.assertIn("0.80", repr(result))
        self.assertIn("0.20", repr(result))
        self.assertIn("PASSED", repr(result))


class TestMeeetGuard(unittest.TestCase):
    """Tests for MeeetGuard class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.guard = MeeetGuard(
            api_key="test_api_key",
            min_trust=0.7,
            max_sara_risk=0.6,
            log_requests=False,
        )
    
    def test_initialization(self):
        """Test MeeetGuard initialization."""
        self.assertEqual(self.guard.api_key, "test_api_key")
        self.assertEqual(self.guard.default_min_trust, 0.7)
        self.assertEqual(self.guard.default_max_sara_risk, 0.6)
        self.assertEqual(self.guard.base_url, "https://meeet.world/api")
    
    def test_custom_base_url(self):
        """Test custom base URL."""
        guard = MeeetGuard(
            api_key="test_key",
            base_url="https://custom.api.com",
        )
        self.assertEqual(guard.base_url, "https://custom.api.com")
    
    @patch("meeet_trust.guard.urllib.request.urlopen")
    def test_check_trust_success(self, mock_urlopen):
        """Test successful trust check."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.2,
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = self.guard.check_trust("did:meeet:agent123")
        
        self.assertEqual(result.trust_score, 0.8)
        self.assertEqual(result.sara_risk, 0.2)
        self.assertTrue(result.passed)
    
    @patch("meeet_trust.guard.urllib.request.urlopen")
    def test_check_trust_alternate_keys(self, mock_urlopen):
        """Test trust check with alternate response keys."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "score": 0.9,
            "risk": 0.1,
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = self.guard.check_trust("did:meeet:agent456")
        
        self.assertEqual(result.trust_score, 0.9)
        self.assertEqual(result.sara_risk, 0.1)
    
    @patch("meeet_trust.guard.urllib.request.urlopen")
    def test_verify_trust_pass(self, mock_urlopen):
        """Test trust verification that passes."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.2,
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = self.guard.verify("did:meeet:agent123", min_trust=0.7)
        
        self.assertTrue(result.passed)
        self.assertIsNone(result.blocked_reason)
    
    @patch("meeet_trust.guard.urllib.request.urlopen")
    def test_verify_trust_fail_low_score(self, mock_urlopen):
        """Test trust verification fails due to low trust score."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.5,
            "sara_risk": 0.2,
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        with self.assertRaises(TrustCheckError) as context:
            self.guard.verify("did:meeet:agent123", min_trust=0.7)
        
        self.assertIn("below minimum", str(context.exception))
    
    @patch("meeet_trust.guard.urllib.request.urlopen")
    def test_verify_trust_fail_high_sara(self, mock_urlopen):
        """Test trust verification fails due to high SARA risk."""
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.8,
            "sara_risk": 0.8,
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        with self.assertRaises(TrustCheckError) as context:
            self.guard.verify("did:meeet:agent123", max_sara_risk=0.6)
        
        self.assertIn("SARA risk", str(context.exception))
    
    def test_before_action_decorator(self):
        """Test before_action decorator creation."""
        my_task = self.guard.before_action(min_trust=0.7)(lambda x: x)
        self.assertTrue(callable(my_task))
    
    def test_crewai_hook(self):
        """Test CrewAI hook creation."""
        hook = self.guard.crewai_hook(min_trust=0.7)
        self.assertTrue(callable(hook))
    
    def test_autogen_middleware(self):
        """Test AutoGen middleware creation."""
        middleware = self.guard.autogen_middleware(min_trust=0.7)
        self.assertTrue(callable(middleware))
    
    def test_langgraph_node(self):
        """Test LangGraph node creation."""
        node = self.guard.langgraph_node(min_trust=0.7)
        self.assertTrue(callable(node))


class TestMeeetGuardIntegration(unittest.TestCase):
    """Integration-style tests with mocked API."""
    
    @patch("meeet_trust.guard.urllib.request.urlopen")
    def test_full_workflow(self, mock_urlopen):
        """Test full trust verification workflow."""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "trust_score": 0.85,
            "sara_risk": 0.15,
            "agent_id": "did:meeet:agent789",
            "identity_verified": True,
            "authorization_status": "approved",
        }).encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        guard = MeeetGuard(api_key="test_key", log_requests=False)
        
        # Verify trust
        result = guard.verify("did:meeet:agent789", min_trust=0.7, max_sara_risk=0.6)
        
        self.assertTrue(result.passed)
        self.assertEqual(result.trust_score, 0.85)
        self.assertEqual(result.sara_risk, 0.15)
        self.assertIsNotNone(result.raw_response)


if __name__ == "__main__":
    unittest.main()
