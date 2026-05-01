"""
Unit tests for MEEET Trust Guard.

Tests cover:
- Trust score retrieval and parsing
- Trust check logic (min_trust, max_risk, 7-gate)
- Caching behavior
- Framework integrations (CrewAI, AutoGen, LangGraph)
- Error handling
"""

import json
import unittest
from unittest.mock import Mock, patch, MagicMock

from meeet_trust import (
    MeeetGuard,
    TrustCheckError,
    TrustScoreTooLow,
    SaraRiskTooHigh,
    ApiError,
    TrustScore,
    TrustCheckResult,
)


class TestTrustScore(unittest.TestCase):
    """Tests for TrustScore dataclass."""
    
    def test_passed_7_gate_all_layers(self):
        """Test 7-gate passes when all layers verified."""
        score = TrustScore(
            agent_did="did:meeet:test",
            trust_score=0.8,
            sara_risk=0.2,
            aps_level=3,
            bayesian_mu=0.8,
            bayesian_sigma=0.1,
            economic_score=0.9,
            social_score=0.7,
            layers_verified=["L1", "L2", "L2.5", "L3", "L4", "L5", "L6"],
        )
        self.assertTrue(score.passed_7_gate)
    
    def test_passed_7_gate_missing_layers(self):
        """Test 7-gate fails when layers missing."""
        score = TrustScore(
            agent_did="did:meeet:test",
            trust_score=0.8,
            sara_risk=0.2,
            aps_level=2,
            bayesian_mu=0.8,
            bayesian_sigma=0.1,
            economic_score=0.9,
            social_score=0.7,
            layers_verified=["L1", "L2", "L3"],
        )
        self.assertFalse(score.passed_7_gate)
    
    def test_passed_7_gate_empty_layers(self):
        """Test 7-gate fails with no layers."""
        score = TrustScore(
            agent_did="did:meeet:test",
            trust_score=0.5,
            sara_risk=0.3,
            aps_level=1,
            bayesian_mu=0.5,
            bayesian_sigma=0.3,
            economic_score=0.5,
            social_score=0.5,
            layers_verified=[],
        )
        self.assertFalse(score.passed_7_gate)


class TestMeeetGuardInit(unittest.TestCase):
    """Tests for MeeetGuard initialization."""
    
    def test_default_values(self):
        """Test default configuration values."""
        guard = MeeetGuard(api_key="test_key")
        self.assertEqual(guard.api_key, "test_key")
        self.assertEqual(guard.default_min_trust, 0.5)
        self.assertEqual(guard.default_max_risk, 0.6)
        self.assertEqual(guard.timeout, 30)
        self.assertEqual(guard.cache_ttl, 300)
    
    def test_custom_values(self):
        """Test custom configuration values."""
        guard = MeeetGuard(
            api_key="test_key",
            default_min_trust=0.8,
            default_max_risk=0.3,
            timeout=60,
            cache_ttl=600,
        )
        self.assertEqual(guard.default_min_trust, 0.8)
        self.assertEqual(guard.default_max_risk, 0.3)
        self.assertEqual(guard.timeout, 60)
        self.assertEqual(guard.cache_ttl, 600)
    
    def test_api_key_from_env(self):
        """Test API key from environment variable."""
        with patch.dict("os.environ", {"MEEET_API_KEY": "env_key"}):
            guard = MeeetGuard()
            self.assertEqual(guard.api_key, "env_key")


class TestTrustCheck(unittest.TestCase):
    """Tests for trust check logic."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_key")
    
    @patch.object(MeeetGuard, '_call_api')
    def test_check_trust_allowed(self, mock_call):
        """Test trust check passes when above thresholds."""
        mock_call.return_value = {
            "trust_score": 0.8,
            "sara_risk": 0.2,
            "aps_level": 3,
            "bayesian": {"mu": 0.8, "sigma": 0.1},
            "economic": {"score": 0.9},
            "social": {"score": 0.7},
            "layers_verified": ["L1", "L2", "L2.5", "L3", "L4", "L5", "L6"],
        }
        
        result = self.guard.check_trust("did:meeet:test", min_trust=0.5, max_risk=0.7)
        
        self.assertTrue(result.allowed)
        self.assertIsNotNone(result.trust_score)
        self.assertEqual(result.trust_score.trust_score, 0.8)
        self.assertEqual(result.trust_score.sara_risk, 0.2)
    
    @patch.object(MeeetGuard, '_call_api')
    def test_check_trust_below_minimum(self, mock_call):
        """Test trust check fails when below minimum trust."""
        mock_call.return_value = {
            "trust_score": 0.3,
            "sara_risk": 0.1,
            "aps_level": 1,
            "bayesian": {"mu": 0.3, "sigma": 0.3},
            "economic": {"score": 0.3},
            "social": {"score": 0.3},
            "layers_verified": ["L1", "L2"],
        }
        
        result = self.guard.check_trust("did:meeet:test", min_trust=0.5)
        
        self.assertFalse(result.allowed)
        self.assertIn("trust_score_too_low", result.blocked_reason)
    
    @patch.object(MeeetGuard, '_call_api')
    def test_check_trust_above_max_risk(self, mock_call):
        """Test trust check fails when SARA risk too high."""
        mock_call.return_value = {
            "trust_score": 0.8,
            "sara_risk": 0.8,
            "aps_level": 3,
            "bayesian": {"mu": 0.8, "sigma": 0.1},
            "economic": {"score": 0.9},
            "social": {"score": 0.7},
            "layers_verified": ["L1", "L2", "L2.5"],
        }
        
        result = self.guard.check_trust("did:meeet:test", max_risk=0.5)
        
        self.assertFalse(result.allowed)
        self.assertIn("sara_risk_too_high", result.blocked_reason)
    
    @patch.object(MeeetGuard, '_call_api')
    def test_check_trust_7_gate_required(self, mock_call):
        """Test trust check fails when 7-gate required but not passed."""
        mock_call.return_value = {
            "trust_score": 0.9,
            "sara_risk": 0.1,
            "aps_level": 3,
            "bayesian": {"mu": 0.9, "sigma": 0.05},
            "economic": {"score": 0.9},
            "social": {"score": 0.8},
            "layers_verified": ["L1", "L2", "L3"],  # Missing L2.5, L4, L5, L6
        }
        
        result = self.guard.check_trust("did:meeet:test", require_7_gate=True)
        
        self.assertFalse(result.allowed)
        self.assertIn("7_gate_not_passed", result.blocked_reason)
    
    @patch.object(MeeetGuard, '_call_api')
    def test_check_trust_7_gate_passed(self, mock_call):
        """Test trust check passes when 7-gate required and passed."""
        mock_call.return_value = {
            "trust_score": 0.9,
            "sara_risk": 0.1,
            "aps_level": 3,
            "bayesian": {"mu": 0.9, "sigma": 0.05},
            "economic": {"score": 0.9},
            "social": {"score": 0.8},
            "layers_verified": ["L1", "L2", "L2.5", "L3", "L4", "L5", "L6"],
        }
        
        result = self.guard.check_trust("did:meeet:test", require_7_gate=True)
        
        self.assertTrue(result.allowed)


class TestCaching(unittest.TestCase):
    """Tests for caching behavior."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_key", cache_ttl=300)
    
    @patch.object(MeeetGuard, '_call_api')
    def test_cache_hit(self, mock_call):
        """Test cache returns cached value."""
        mock_call.return_value = {
            "trust_score": 0.8,
            "sara_risk": 0.2,
            "aps_level": 2,
            "bayesian": {"mu": 0.8, "sigma": 0.1},
            "economic": {"score": 0.8},
            "social": {"score": 0.6},
            "layers_verified": ["L1", "L2"],
        }
        
        # First call - should hit API
        score1 = self.guard.get_trust_score("did:meeet:test")
        # Second call - should hit cache
        score2 = self.guard.get_trust_score("did:meeet:test")
        
        self.assertEqual(mock_call.call_count, 1)
        self.assertEqual(score1.trust_score, score2.trust_score)
    
    @patch.object(MeeetGuard, '_call_api')
    def test_cache_miss_disabled(self, mock_call):
        """Test cache disabled when TTL is 0."""
        guard = MeeetGuard(api_key="test_key", cache_ttl=0)
        mock_call.return_value = {
            "trust_score": 0.8,
            "sara_risk": 0.2,
            "aps_level": 2,
            "bayesian": {"mu": 0.8, "sigma": 0.1},
            "economic": {"score": 0.8},
            "social": {"score": 0.6},
            "layers_verified": ["L1", "L2"],
        }
        
        guard.get_trust_score("did:meeet:test")
        guard.get_trust_score("did:meeet:test")
        
        self.assertEqual(mock_call.call_count, 2)
    
    def test_clear_cache_specific(self):
        """Test clearing specific agent cache."""
        self.guard._cache["did:meeet:test"] = (0, Mock(spec=TrustScore))
        self.guard.clear_cache("did:meeet:test")
        self.assertNotIn("did:meeet:test", self.guard._cache)
    
    def test_clear_cache_all(self):
        """Test clearing all cache."""
        self.guard._cache["did:meeet:test1"] = (0, Mock(spec=TrustScore))
        self.guard._cache["did:meeet:test2"] = (0, Mock(spec=TrustScore))
        self.guard.clear_cache()
        self.assertEqual(len(self.guard._cache), 0)


class TestBeforeActionDecorator(unittest.TestCase):
    """Tests for before_action decorator."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_key")
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_decorator_allows(self, mock_check):
        """Test decorator allows action when trust passes."""
        mock_check.return_value = TrustCheckResult(
            allowed=True,
            trust_score=TrustScore(
                agent_did="did:meeet:test",
                trust_score=0.8,
                sara_risk=0.2,
                aps_level=2,
                bayesian_mu=0.8,
                bayesian_sigma=0.1,
                economic_score=0.8,
                social_score=0.6,
                layers_verified=["L1", "L2"],
            ),
        )
        
        @self.guard.before_action(min_trust=0.7)
        def my_task(agent_did: str, value: int):
            return f"Task completed with {value}"
        
        result = my_task("did:meeet:test", 42)
        
        self.assertEqual(result, "Task completed with 42")
        mock_check.assert_called_once()
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_decorator_blocks(self, mock_check):
        """Test decorator blocks action when trust fails."""
        mock_check.return_value = TrustCheckResult(
            allowed=False,
            blocked_reason="trust_score_too_low: 0.3 < 0.7",
        )
        
        @self.guard.before_action(min_trust=0.7)
        def my_task(agent_did: str, value: int):
            return f"Task completed with {value}"
        
        result = my_task("did:meeet:test", 42)
        
        self.assertIsNone(result)
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_decorator_no_agent_did(self, mock_check):
        """Test decorator raises error when agent_did not found."""
        @self.guard.before_action(min_trust=0.7)
        def my_task(other_param: str):
            return "Task completed"
        
        with self.assertRaises(TrustCheckError) as ctx:
            my_task("some_value")
        
        self.assertIn("Could not find agent_did", str(ctx.exception))


class TestCrewAIIntegration(unittest.TestCase):
    """Tests for CrewAI integration."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_key")
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_crewai_before_task_allows(self, mock_check):
        """Test CrewAI hook allows when trust passes."""
        mock_check.return_value = TrustCheckResult(allowed=True)
        
        result = self.guard.crewai_before_task("did:meeet:test")
        
        self.assertTrue(result)
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_crewai_before_task_blocks(self, mock_check):
        """Test CrewAI hook blocks when trust fails."""
        mock_check.return_value = TrustCheckResult(allowed=False)
        
        result = self.guard.crewai_before_task("did:meeet:test")
        
        self.assertFalse(result)


class TestLangGraphIntegration(unittest.TestCase):
    """Tests for LangGraph integration."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_key")
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_langgraph_node_allows(self, mock_check):
        """Test LangGraph node allows when trust passes."""
        mock_check.return_value = TrustCheckResult(
            allowed=True,
            trust_score=TrustScore(
                agent_did="did:meeet:test",
                trust_score=0.8,
                sara_risk=0.2,
                aps_level=2,
                bayesian_mu=0.8,
                bayesian_sigma=0.1,
                economic_score=0.8,
                social_score=0.6,
                layers_verified=["L1", "L2"],
            ),
        )
        
        state = {"agent_did": "did:meeet:test", "task": "analyze"}
        result = self.guard.langgraph_node(state)
        
        self.assertTrue(result["trust_allowed"])
        self.assertEqual(result["trust_score"], 0.8)
        self.assertEqual(result["sara_risk"], 0.2)
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_langgraph_node_blocks(self, mock_check):
        """Test LangGraph node blocks when trust fails."""
        mock_check.return_value = TrustCheckResult(
            allowed=False,
            blocked_reason="trust_score_too_low",
        )
        
        state = {"agent_did": "did:meeet:test", "task": "analyze"}
        result = self.guard.langgraph_node(state)
        
        self.assertFalse(result["trust_allowed"])
        self.assertEqual(result["trust_error"], "trust_score_too_low")
    
    def test_langgraph_node_no_agent_did(self):
        """Test LangGraph node handles missing agent_did."""
        state = {"task": "analyze"}
        result = self.guard.langgraph_node(state)
        
        self.assertFalse(result["trust_allowed"])
        self.assertIn("No agent_did", result["trust_error"])


class TestAutoGenIntegration(unittest.TestCase):
    """Tests for AutoGen integration."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_key")
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_autogen_middleware_allows(self, mock_check):
        """Test AutoGen middleware allows when trust passes."""
        mock_check.return_value = TrustCheckResult(allowed=True)
        
        result = self.guard.autogen_middleware("did:meeet:test", "search")
        
        self.assertTrue(result)
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_autogen_middleware_blocks(self, mock_check):
        """Test AutoGen middleware blocks when trust fails."""
        mock_check.return_value = TrustCheckResult(allowed=False)
        
        result = self.guard.autogen_middleware("did:meeet:test", "search")
        
        self.assertFalse(result)


class TestApiErrorHandling(unittest.TestCase):
    """Tests for API error handling."""
    
    def setUp(self):
        self.guard = MeeetGuard(api_key="test_key")
    
    @patch('urllib.request.urlopen')
    def test_api_http_error(self, mock_urlopen):
        """Test handling of HTTP errors."""
        from urllib.error import HTTPError
        
        error = HTTPError(
            url="https://meeet.world/api/trust/test",
            code=404,
            msg="Not Found",
            hdrs={},
            fp=None,
        )
        error.read = Mock(return_value=b'{"error": "Agent not found"}')
        mock_urlopen.side_effect = error
        
        with self.assertRaises(ApiError) as ctx:
            self.guard.get_trust_score("did:meeet:test")
        
        self.assertEqual(ctx.exception.status_code, 404)
    
    @patch('urllib.request.urlopen')
    def test_api_url_error(self, mock_urlopen):
        """Test handling of URL errors."""
        from urllib.error import URLError
        
        mock_urlopen.side_effect = URLError("Connection refused")
        
        with self.assertRaises(ApiError):
            self.guard.get_trust_score("did:meeet:test")


class TestConvenienceFunction(unittest.TestCase):
    """Tests for convenience check_trust function."""
    
    @patch.object(MeeetGuard, 'check_trust')
    def test_convenience_function(self, mock_check):
        """Test convenience function works."""
        from meeet_trust.meeet_guard import check_trust
        
        mock_check.return_value = TrustCheckResult(allowed=True)
        
        result = check_trust("did:meeet:test", api_key="key", min_trust=0.7)
        
        self.assertTrue(result.allowed)
        mock_check.assert_called_once()


class TestExceptions(unittest.TestCase):
    """Tests for custom exceptions."""
    
    def test_trust_score_too_low(self):
        """Test TrustScoreTooLow exception."""
        exc = TrustScoreTooLow("did:meeet:test", 0.3, 0.7)
        self.assertEqual(exc.agent_did, "did:meeet:test")
        self.assertEqual(exc.trust_score, 0.3)
        self.assertEqual(exc.min_trust, 0.7)
        self.assertIn("0.3", str(exc))
        self.assertIn("0.7", str(exc))
    
    def test_sara_risk_too_high(self):
        """Test SaraRiskTooHigh exception."""
        exc = SaraRiskTooHigh("did:meeet:test", 0.8, 0.5)
        self.assertEqual(exc.agent_did, "did:meeet:test")
        self.assertEqual(exc.sara_risk, 0.8)
        self.assertEqual(exc.max_risk, 0.5)
        self.assertIn("0.8", str(exc))
        self.assertIn("0.5", str(exc))
    
    def test_api_error(self):
        """Test ApiError exception."""
        exc = ApiError("Server error", 500)
        self.assertEqual(exc.status_code, 500)
        self.assertIn("Server error", str(exc))


if __name__ == "__main__":
    unittest.main()
