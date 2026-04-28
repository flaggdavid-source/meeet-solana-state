"""
Tests for CrewAI adapter.
"""

import pytest
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from meeet_trust import MeeetGuard, TrustVerificationFailed
from meeet_trust.crewai_adapter import (
    MeeetCrewAIHook,
    create_meeet_task_hook,
    crewai_before_task,
)


class TestMeeetCrewAIHook:
    """Test cases for MeeetCrewAIHook."""
    
    @pytest.fixture
    def guard(self):
        """Create a MeeetGuard instance for testing."""
        return MeeetGuard(
            api_key="test_api_key",
            default_min_trust=0.5,
            default_max_sara=0.6,
            block_on_fail=True,
        )
    
    @pytest.fixture
    def hook(self, guard):
        """Create a MeeetCrewAIHook instance for testing."""
        return MeeetCrewAIHook(
            guard=guard,
            min_trust=0.5,
            max_sara=0.6,
        )
    
    @pytest.fixture
    def mock_task(self):
        """Create a mock CrewAI task object."""
        task = MagicMock()
        task.description = "Test research task"
        
        # Mock agent with agent_did
        agent = MagicMock()
        agent.agent_did = "did:meeet:test_agent"
        task.agent = agent
        
        return task
    
    def test_before_task_success(self, hook, mock_task):
        """Test before_task passes when trust verification succeeds."""
        with patch.object(hook.guard, '_get_trust_score', return_value=0.85), \
             patch.object(hook.guard, '_get_sara_risk', return_value=0.3):
            
            # Should not raise
            hook.before_task(mock_task)
    
    def test_before_task_failure(self, hook, mock_task):
        """Test before_task raises when trust verification fails."""
        with patch.object(hook.guard, '_get_trust_score', return_value=0.3), \
             patch.object(hook.guard, '_get_sara_risk', return_value=0.3):
            
            with pytest.raises(TrustVerificationFailed):
                hook.before_task(mock_task)
    
    def test_extract_agent_did_from_agent(self, hook, mock_task):
        """Test extracting agent DID from task.agent."""
        agent_did = hook._extract_agent_did(mock_task)
        assert agent_did == "did:meeet:test_agent"
    
    def test_extract_agent_did_no_agent(self, hook):
        """Test extracting agent DID when no agent present."""
        task = MagicMock(spec=['agent', 'description'])
        task.agent = None
        
        agent_did = hook._extract_agent_did(task)
        assert agent_did is None


class TestCreateMeeetTaskHook:
    """Test cases for create_meeet_task_hook function."""
    
    def test_create_hook(self):
        """Test creating a MeeetTaskHook."""
        guard = MeeetGuard(api_key="test_key")
        
        hook = create_meeet_task_hook(
            guard=guard,
            min_trust=0.7,
            max_sara=0.5,
        )
        
        assert isinstance(hook, MeeetCrewAIHook)
        assert hook.min_trust == 0.7
        assert hook.max_sara == 0.5


class TestCrewaiBeforeTask:
    """Test cases for crewai_before_task function."""
    
    def test_create_before_task_hook(self):
        """Test creating a before_task hook."""
        hook = crewai_before_task(
            api_key="test_key",
            min_trust=0.7,
            max_sara=0.5,
        )
        
        assert isinstance(hook, MeeetCrewAIHook)
        assert hook.min_trust == 0.7
        assert hook.max_sara == 0.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
