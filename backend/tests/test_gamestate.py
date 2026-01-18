"""
Tests for GameState model.
"""
import pytest
from simulation import GameState, Sprint, SprintPhase


class TestGameState:
    """Test suite for GameState class."""

    def test_initial_state(self, game_state):
        """Test that GameState initializes with correct defaults."""
        assert game_state.week == 1
        assert game_state.level == 1
        assert game_state.stability == 80
        assert game_state.morale == 70
        assert game_state.budget == 500000
        assert game_state.unplanned_work == 80
        assert game_state.wip_limit == 99
        assert game_state.phoenix_progress == 0

    def test_level_6_metrics_initialization(self, game_state):
        """Test Level 6 specific metrics are initialized."""
        assert game_state.bus_factor == 1
        assert game_state.knowledge == 10
        assert game_state.process_efficiency == 20
        assert game_state.vsm_ratio == 90
        assert game_state.learning_rate == 10
        assert game_state.experiment_velocity == 5
        assert game_state.cicd_coverage == 0
        assert game_state.quality_score == 30

    def test_experiments_initialization(self, game_state):
        """Test experiment-related fields are initialized."""
        assert hasattr(game_state, 'experiments')
        assert hasattr(game_state, 'experiment_counter')
        assert hasattr(game_state, 'completed_experiments_count')
        assert game_state.experiments == []
        assert game_state.experiment_counter == 0
        assert game_state.completed_experiments_count == 0

    def test_tasks_structure(self, game_state):
        """Test tasks are organized by columns."""
        assert 'backlog' in game_state.tasks
        assert 'in_progress' in game_state.tasks
        assert 'review' in game_state.tasks
        assert 'done' in game_state.tasks
        assert game_state.tasks['backlog'] == []
        assert game_state.tasks['in_progress'] == []
        assert game_state.tasks['review'] == []
        assert game_state.tasks['done'] == []

    def test_resources_initialization(self, game_state):
        """Test resources list includes Brent."""
        assert len(game_state.resources) > 0
        brent = next((r for r in game_state.resources if r['id'] == 'brent'), None)
        assert brent is not None
        assert brent['name'] == 'Брент'
        assert brent['role'] == 'Lead Engineer'

    def test_chat_and_mentor_logs(self, game_state):
        """Test chat history and mentor log are initialized."""
        assert len(game_state.chat_history) > 0
        assert len(game_state.mentor_log) > 0
        assert game_state.chat_history[0]['sender'] == 'System'
        assert game_state.mentor_log[0]['sender'] == 'Эрик'

    def test_to_dict_serialization(self, game_state):
        """Test GameState can be serialized to dict."""
        data = game_state.to_dict()
        assert isinstance(data, dict)
        assert data['week'] == 1
        assert data['level'] == 1
        assert data['stability'] == 80
        assert 'experiments' in data

    def test_from_dict_deserialization(self, game_state):
        """Test GameState can be deserialized from dict."""
        original_data = game_state.to_dict()
        restored_state = GameState.from_dict(original_data)

        assert restored_state.week == game_state.week
        assert restored_state.level == game_state.level
        assert restored_state.stability == game_state.stability
        assert restored_state.budget == game_state.budget


class TestSprint:
    """Test suite for Sprint class."""

    def test_sprint_creation(self):
        """Test Sprint can be created with correct defaults."""
        sprint = Sprint(1, "Test Sprint", 2)
        assert sprint.id == 1
        assert sprint.goal == "Test Sprint"
        assert sprint.duration_weeks == 2
        assert sprint.current_week == 0
        assert sprint.phase == SprintPhase.PLANNING
        assert sprint.planned_velocity == 0
        assert sprint.actual_velocity == 0
        assert sprint.task_ids == []

    def test_sprint_to_dict(self):
        """Test Sprint can be serialized to dict."""
        sprint = Sprint(1, "Test Sprint", 2)
        data = sprint.to_dict()
        assert data['id'] == 1
        assert data['goal'] == "Test Sprint"
        assert data['duration_weeks'] == 2
        assert data['phase'] == 'planning'

    def test_sprint_phase_enum(self):
        """Test SprintPhase enum has all expected values."""
        assert SprintPhase.PLANNING.value == 'planning'
        assert SprintPhase.ACTIVE.value == 'active'
        assert SprintPhase.REVIEW.value == 'review'
        assert SprintPhase.RETRO.value == 'retro'
        assert SprintPhase.COMPLETED.value == 'completed'
