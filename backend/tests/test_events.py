"""
Tests for Event system.
"""
import pytest
from simulation import (
    Event, EventLibrary, EventGenerator,
    EventSeverity, EventType, GameState
)


class TestEventSeverity:
    """Test EventSeverity enum."""

    def test_severity_values(self):
        """Test all severity levels exist."""
        assert EventSeverity.LOW.value == 'low'
        assert EventSeverity.MEDIUM.value == 'medium'
        assert EventSeverity.HIGH.value == 'high'
        assert EventSeverity.CRITICAL.value == 'critical'


class TestEventType:
    """Test EventType enum."""

    def test_type_values(self):
        """Test all event types exist."""
        assert EventType.TECHNICAL.value == 'technical'
        assert EventType.BUSINESS.value == 'business'
        assert EventType.TEAM.value == 'team'
        assert EventType.EXTERNAL.value == 'external'
        assert EventType.RANDOM.value == 'random'


class TestEvent:
    """Test Event class."""

    def test_event_creation(self):
        """Test Event can be created with all parameters."""
        choices = [
            {"id": "choice1", "text": "Option 1", "consequences": {"budget": -1000}}
        ]
        event = Event(
            event_id="test-event",
            title="Test Event",
            description="A test event",
            event_type=EventType.TECHNICAL,
            severity=EventSeverity.HIGH,
            choices=choices
        )
        assert event.id == "test-event"
        assert event.title == "Test Event"
        assert event.type == EventType.TECHNICAL
        assert event.severity == EventSeverity.HIGH
        assert len(event.choices) == 1

    def test_event_to_dict(self):
        """Test Event can be serialized to dict."""
        choices = [
            {"id": "choice1", "text": "Option 1", "consequences": {"budget": -1000}}
        ]
        event = Event(
            event_id="test-event",
            title="Test Event",
            description="A test event",
            event_type=EventType.TECHNICAL,
            severity=EventSeverity.HIGH,
            choices=choices
        )
        data = event.to_dict()
        assert data['id'] == "test-event"
        assert data['title'] == "Test Event"
        assert data['type'] == 'technical'
        assert data['severity'] == 'high'
        assert len(data['choices']) == 1


class TestEventLibrary:
    """Test EventLibrary class."""

    def test_technical_events_exist(self):
        """Test technical events are defined."""
        assert len(EventLibrary.TECHNICAL_EVENTS) > 0
        for event in EventLibrary.TECHNICAL_EVENTS:
            assert 'id' in event
            assert 'title' in event
            assert 'type' in event
            assert event['type'] == EventType.TECHNICAL

    def test_business_events_exist(self):
        """Test business events are defined."""
        assert len(EventLibrary.BUSINESS_EVENTS) > 0
        for event in EventLibrary.BUSINESS_EVENTS:
            assert event['type'] == EventType.BUSINESS

    def test_team_events_exist(self):
        """Test team events are defined."""
        assert len(EventLibrary.TEAM_EVENTS) > 0
        for event in EventLibrary.TEAM_EVENTS:
            assert event['type'] == EventType.TEAM

    def test_external_events_exist(self):
        """Test external events are defined."""
        assert len(EventLibrary.EXTERNAL_EVENTS) > 0
        for event in EventLibrary.EXTERNAL_EVENTS:
            assert event['type'] == EventType.EXTERNAL

    def test_get_all_events(self):
        """Test get_all_events returns all events."""
        all_events = EventLibrary.get_all_events()
        assert len(all_events) > 0
        expected_count = (
            len(EventLibrary.TECHNICAL_EVENTS) +
            len(EventLibrary.BUSINESS_EVENTS) +
            len(EventLibrary.TEAM_EVENTS) +
            len(EventLibrary.EXTERNAL_EVENTS)
        )
        assert len(all_events) == expected_count

    def test_get_events_for_level(self):
        """Test get_events_for_level includes level-specific events."""
        level_1_events = EventLibrary.get_events_for_level(1)
        assert len(level_1_events) > 0

        # Should include all general events plus level-specific ones
        general_count = len(EventLibrary.get_all_events())
        assert len(level_1_events) >= general_count


class TestEventGenerator:
    """Test EventGenerator class."""

    def test_generator_initialization(self):
        """Test EventGenerator can be created."""
        generator = EventGenerator()
        assert generator.triggered_events == set()

    def test_can_trigger_level_check(self, game_state):
        """Test can_trigger checks level requirement."""
        generator = EventGenerator()
        # Event that requires level 2
        level_2_event = {
            "id": "test",
            "trigger": {"level": [2, 3]}
        }
        # Should not trigger on level 1
        assert not generator.can_trigger(level_2_event, game_state)
        # Should trigger on level 2
        game_state.level = 2
        assert generator.can_trigger(level_2_event, game_state)

    def test_can_trigger_random_chance(self, game_state):
        """Test can_trigger respects random chance."""
        generator = EventGenerator()
        # Event with 0% chance should not trigger
        no_chance_event = {
            "id": "test-no-chance",
            "trigger": {"random_chance": 0.0}
        }
        assert not generator.can_trigger(no_chance_event, game_state)

        # Event with 100% chance should trigger
        always_event = {
            "id": "test-always",
            "trigger": {"random_chance": 1.0}
        }
        assert generator.can_trigger(always_event, game_state)

    def test_can_trigger_unplanned_work(self, game_state):
        """Test can_trigger checks unplanned work thresholds."""
        generator = EventGenerator()
        # Event requiring unplanned_work above 50
        high_unplanned_event = {
            "id": "test-high-unplanned",
            "trigger": {"unplanned_work_above": 50}
        }
        game_state.unplanned_work = 80
        assert generator.can_trigger(high_unplanned_event, game_state)

        game_state.unplanned_work = 30
        assert not generator.can_trigger(high_unplanned_event, game_state)

    def test_can_trigger_morale_below(self, game_state):
        """Test can_trigger checks morale thresholds."""
        generator = EventGenerator()
        # Event triggering when morale below 50
        low_morale_event = {
            "id": "test-low-morale",
            "trigger": {"morale_below": 50}
        }
        game_state.morale = 30
        assert generator.can_trigger(low_morale_event, game_state)

        game_state.morale = 70
        assert not generator.can_trigger(low_morale_event, game_state)

    def test_reset_triggered(self):
        """Test reset_triggered clears triggered events."""
        generator = EventGenerator()
        generator.triggered_events.add("test-event")
        generator.reset_triggered()
        assert len(generator.triggered_events) == 0

    def test_generate_event(self, game_state):
        """Test generate_event returns valid event or None."""
        generator = EventGenerator()
        # Set high random chance for testing
        EventLibrary.TECHNICAL_EVENTS[0]['trigger'] = {'random_chance': 1.0}

        event = generator.generate_event(game_state)
        # Event might be None if no conditions met, but if returned should be valid
        if event:
            assert isinstance(event, Event)
            assert event.id is not None
            assert event.title is not None
