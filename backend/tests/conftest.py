"""
Pytest configuration and fixtures for backend tests.
"""
import sys
import os
import pytest

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture
def game_state():
    """Create a fresh GameState for each test."""
    from simulation import GameState
    state = GameState()
    return state


@pytest.fixture
def engine():
    """Create a fresh SimulationEngine for each test."""
    from simulation import SimulationEngine
    return SimulationEngine()
