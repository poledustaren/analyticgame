"""
Tests for Quiz minigame.
"""
import pytest
from simulation import QuizSession


class TestQuizSession:
    """Test suite for QuizSession class."""

    def test_session_initialization(self):
        """Test QuizSession initializes with correct defaults."""
        session = QuizSession()
        assert session.score == 0
        assert session.total_answered == 0
        assert session.answered_questions == []
        assert session.current_question is None

    def test_questions_exist(self):
        """Test quiz has questions defined."""
        session = QuizSession()
        assert len(QuizSession.QUESTIONS) > 0
        assert len(QuizSession.QUESTIONS) == 8

    def test_question_structure(self):
        """Test each question has required fields."""
        for q in QuizSession.QUESTIONS:
            assert 'id' in q
            assert 'question' in q
            assert 'options' in q
            assert 'correct' in q
            assert 'explanation' in q
            assert len(q['options']) == 4  # Multiple choice: 4 options

    def test_get_random_question(self):
        """Test get_random_question returns a valid question."""
        session = QuizSession()
        question = session.get_random_question()

        assert question is not None
        assert 'id' in question
        assert 'question' in question
        assert 'options' in question

    def test_get_random_question_excludes_answered(self):
        """Test get_random_question doesn't return answered questions."""
        session = QuizSession()

        # Answer first question
        first_question = session.get_random_question()
        session.answered_questions.append(first_question['id'])

        # Get another question - should be different or None if all answered
        next_question = session.get_random_question()
        if next_question:
            assert next_question['id'] != first_question['id']

    def test_get_random_question_returns_none_when_all_answered(self):
        """Test get_random_question returns None when all questions answered."""
        session = QuizSession()

        # Mark all questions as answered
        all_ids = [q['id'] for q in QuizSession.QUESTIONS]
        session.answered_questions = all_ids

        question = session.get_random_question()
        assert question is None

    def test_start_question(self):
        """Test start_question sets current_question."""
        session = QuizSession()
        result = session.start_question()

        assert 'current_question' in result
        assert result['current_question'] is not None
        assert session.current_question is not None

    def test_answer_correct(self):
        """Test answering correctly updates score."""
        session = QuizSession()
        session.start_question()

        # Get the correct answer
        correct_index = session.current_question['correct']
        result = session.answer(correct_index)

        assert result['is_correct'] is True
        assert session.score == 1
        assert session.total_answered == 1
        assert session.current_question is None  # Question cleared after answering

    def test_answer_incorrect(self):
        """Test answering incorrectly doesn't update score."""
        session = QuizSession()
        session.start_question()

        # Get an incorrect answer
        correct_index = session.current_question['correct']
        wrong_index = (correct_index + 1) % 4
        result = session.answer(wrong_index)

        assert result['is_correct'] is False
        assert session.score == 0
        assert session.total_answered == 1

    def test_answer_without_question(self):
        """Test answering without active question returns error."""
        session = QuizSession()
        result = session.answer(0)

        assert 'error' in result

    def test_answer_returns_explanation(self):
        """Test answer result includes explanation."""
        session = QuizSession()
        session.start_question()

        result = session.answer(0)
        assert 'explanation' in result
        assert result['explanation'] is not None

    def test_answer_returns_correct_answer(self):
        """Test answer result includes correct answer index."""
        session = QuizSession()
        session.start_question()

        result = session.answer(0)
        assert 'correct_answer' in result
        assert isinstance(result['correct_answer'], int)

    def test_to_dict(self):
        """Test QuizSession can be serialized."""
        session = QuizSession()
        session.start_question()

        data = session.to_dict()
        assert 'score' in data
        assert 'total_answered' in data
        assert 'remaining' in data
        assert data['score'] == 0
        assert data['total_answered'] == 0
        assert data['remaining'] == len(QuizSession.QUESTIONS)

    def test_question_content_bottleneck(self):
        """Test bottleneck question is correct."""
        session = QuizSession()
        bottleneck_q = next(q for q in QuizSession.QUESTIONS if q['id'] == 'q1')

        assert "bottleneck" in bottleneck_q['question'].lower()
        assert bottleneck_q['correct'] == 0

    def test_question_content_unplanned_work(self):
        """Test unplanned work question is correct."""
        session = QuizSession()
        unplanned_q = next(q for q in QuizSession.QUESTIONS if q['id'] == 'q2')

        # Question mentions fires/incidents (пожары и инциденты)
        assert "пожары" in unplanned_q['question'].lower() or "incidents" in unplanned_q['question'].lower()
        # Correct answer is Unplanned Work (index 3)
        assert unplanned_q['correct'] == 3
        assert unplanned_q['options'][3] == "Unplanned Work"

    def test_all_answered_tracking(self):
        """Test tracking when all questions are answered."""
        session = QuizSession()

        # Answer all questions
        for _ in range(len(QuizSession.QUESTIONS)):
            session.start_question()
            if session.current_question:
                session.answer(session.current_question['correct'])

        assert session.total_answered == len(QuizSession.QUESTIONS)
        assert session.get_random_question() is None

    def test_remaining_count(self):
        """Test remaining count decreases as questions answered."""
        session = QuizSession()
        total = len(QuizSession.QUESTIONS)

        session.start_question()
        session.answer(session.current_question['correct'])

        data = session.to_dict()
        assert data['remaining'] == total - 1
        assert data['total_answered'] == 1
