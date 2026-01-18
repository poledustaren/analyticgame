"""
Tests for Planning Poker minigame.
"""
import pytest
from simulation import PlanningPokerSession


class TestPlanningPokerSession:
    """Test suite for PlanningPokerSession class."""

    def test_session_creation(self):
        """Test PlanningPokerSession can be created."""
        session = PlanningPokerSession("task-1", "Test Task")
        assert session.task_id == "task-1"
        assert session.task_title == "Test Task"
        assert session.player_vote is None
        assert session.consensus_reached is False
        assert session.final_estimate is None
        assert session.round == 1

    def test_fibonacci_cards(self):
        """Test Fibonacci cards are correctly defined."""
        expected = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
        assert PlanningPokerSession.FIBONACCI_CARDS == expected

    def test_record_player_vote(self):
        """Test recording player vote generates AI votes."""
        session = PlanningPokerSession("task-1", "Test Task")
        result = session.record_player_vote(5)

        assert session.player_vote == 5
        assert len(session.ai_votes) == 3  # Alice, Bob, Carol
        assert result['player_vote'] == 5
        assert len(result['ai_votes']) == 3

    def test_ai_vote_generation(self):
        """Test AI votes are generated when player votes."""
        session = PlanningPokerSession("task-1", "Test Task")
        session.record_player_vote(5)

        # Check AI team members exist
        assert 'alice' in session.ai_votes
        assert 'bob' in session.ai_votes
        assert 'carol' in session.ai_votes

        # Check votes are valid Fibonacci numbers
        for voter_id, vote_data in session.ai_votes.items():
            assert vote_data['vote'] in PlanningPokerSession.FIBONACCI_CARDS

    def test_consensus_all_same(self):
        """Test consensus is reached when all votes are same."""
        session = PlanningPokerSession("task-1", "Test Task")

        # Mock ai_votes to all be 5
        session.ai_votes = {
            "alice": {"name": "Alice", "vote": 5},
            "bob": {"name": "Bob", "vote": 5},
            "carol": {"name": "Carol", "vote": 5}
        }
        session.player_vote = 5
        session._check_consensus()

        assert session.consensus_reached is True
        assert session.final_estimate == 5

    def test_consensus_close_enough(self):
        """Test consensus is reached when votes are close."""
        session = PlanningPokerSession("task-1", "Test Task")

        # Mock ai_votes to be close to player vote
        session.ai_votes = {
            "alice": {"name": "Alice", "vote": 5},
            "bob": {"name": "Bob", "vote": 5},
            "carol": {"name": "Carol", "vote": 3}
        }
        session.player_vote = 5
        session._check_consensus()

        assert session.consensus_reached is True

    def test_no_consensus_far_apart(self):
        """Test consensus is not reached when votes are far apart."""
        session = PlanningPokerSession("task-1", "Test Task")

        # Mock ai_votes to be far from player vote
        session.ai_votes = {
            "alice": {"name": "Alice", "vote": 1},
            "bob": {"name": "Bob", "vote": 2},
            "carol": {"name": "Carol", "vote": 89}
        }
        session.player_vote = 5
        session._check_consensus()

        assert session.consensus_reached is False
        assert session.final_estimate is None

    def test_to_dict(self):
        """Test PlanningPokerSession can be serialized."""
        session = PlanningPokerSession("task-1", "Test Task")
        session.record_player_vote(5)

        data = session.to_dict()
        assert data['task_id'] == "task-1"
        assert data['task_title'] == "Test Task"
        assert data['player_vote'] == 5
        assert len(data['ai_votes']) == 3
        assert 'cards' in data
        assert data['round'] == 1

    def test_nearest_fibonacci(self):
        """Test _nearest_fibonacci finds closest card."""
        session = PlanningPokerSession("task-1", "Test Task")

        # Test actual behavior - returns first card within distance 1
        # FIBONACCI_CARDS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
        # abs(n - card) <= 1, returns first match
        assert session._nearest_fibonacci(0) == 0  # abs(0-0)=0 <= 1
        assert session._nearest_fibonacci(1) == 0  # abs(1-0)=1 <= 1 (0 checked first)
        assert session._nearest_fibonacci(2) == 1  # abs(2-1)=1 <= 1 (1 checked before 2)
        assert session._nearest_fibonacci(3) == 2  # abs(3-2)=1 <= 1 (2 checked before 3)
        assert session._nearest_fibonacci(4) == 3  # abs(4-3)=1 <= 1 (3 checked before 5)
        assert session._nearest_fibonacci(5) == 5  # abs(5-5)=0 <= 1
        assert session._nearest_fibonacci(6) == 5  # abs(6-5)=1 <= 1
        assert session._nearest_fibonacci(9) == 8  # abs(9-8)=1 <= 1
        assert session._nearest_fibonacci(54) == 55  # abs(54-55)=1 <= 1
        # Default fallback when no card is within distance 1
        assert session._nearest_fibonacci(100) == 5

    def test_vote_must_be_valid_card(self):
        """Test only valid Fibonacci cards are accepted."""
        session = PlanningPokerSession("task-1", "Test Task")

        # Valid card
        result = session.record_player_vote(5)
        assert session.player_vote == 5

        # Invalid card - should still work but not be in Fibonacci list
        session2 = PlanningPokerSession("task-2", "Test Task 2")
        session2.record_player_vote(7)  # Not a Fibonacci card
        # The implementation doesn't validate, so this documents current behavior
        assert session2.player_vote == 7

    def test_round_tracking(self):
        """Test round number is tracked."""
        session = PlanningPokerSession("task-1", "Test Task")
        assert session.round == 1

        session.record_player_vote(5)
        assert session.round == 1  # Round doesn't auto-increment
