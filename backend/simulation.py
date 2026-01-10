import random
import json
import os
import glob
from datetime import datetime, timedelta
from enum import Enum
import requests
from typing import List, Dict, Callable, Optional

SAVES_DIR = os.path.join(os.path.dirname(__file__), 'saves')

# --- Event System ---

class EventSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class EventType(Enum):
    TECHNICAL = "technical"      # Bugs, outages, technical debt
    BUSINESS = "business"        # Requirement changes, stakeholder requests
    TEAM = "team"                # Resource issues, conflicts, morale
    EXTERNAL = "external"        # Vendor problems, regulatory changes
    RANDOM = "random"            # Pure chance events

class Event:
    """Represents a procedural event with choices and consequences."""
    def __init__(self, event_id: str, title: str, description: str,
                 event_type: EventType, severity: EventSeverity,
                 choices: List[Dict], trigger_conditions: Optional[Dict] = None):
        self.id = event_id
        self.title = title
        self.description = description
        self.type = event_type
        self.severity = severity
        self.choices = choices  # List of {"id": str, "text": str, "consequences": Dict}
        self.trigger_conditions = trigger_conditions or {}
        self.timestamp = datetime.now()

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "type": self.type.value,
            "severity": self.severity.value,
            "choices": self.choices,
            "timestamp": self.timestamp.isoformat()
        }

class EventLibrary:
    """Library of event templates for procedural generation."""

    TECHNICAL_EVENTS = [
        {
            "id": "tech-bug-prod",
            "title": "🐛 Production Bug Detected",
            "description": "Critical bug found in production. Customers are reporting issues.",
            "type": EventType.TECHNICAL,
            "severity": EventSeverity.HIGH,
            "trigger": {"unplanned_work": 0, "level": [1, 2, 3]},
            "choices": [
                {
                    "id": "hotfix",
                    "text": "🔥 Deploy hotfix immediately (risky)",
                    "consequences": {"budget": -5000, "stability": -10, "unplanned_work": 15}
                },
                {
                    "id": "investigate",
                    "text": "🔍 Investigate first (safer but slower)",
                    "consequences": {"budget": -2000, "stability": -5, "unplanned_work": 10}
                },
                {
                    "id": "ignore",
                    "text": "⏳ Wait for next release",
                    "consequences": {"stability": -20, "morale": -15}
                }
            ]
        },
        {
            "id": "tech-debt",
            "title": "🏗️ Technical Debt Accumulating",
            "description": "Code review shows increasing technical debt in core modules.",
            "type": EventType.TECHNICAL,
            "severity": EventSeverity.MEDIUM,
            "trigger": {"level": [2, 3, 4]},
            "choices": [
                {
                    "id": "refactor-now",
                    "text": "Refactor now (delay features)",
                    "consequences": {"budget": -8000, "unplanned_work": -10, "stability": 15}
                },
                {
                    "id": "refactor-later",
                    "text": "Schedule for next sprint",
                    "consequences": {"unplanned_work": 5, "stability": -5}
                }
            ]
        },
        {
            "id": "tech-server-down",
            "title": "🔴 Server Outage",
            "description": "Main application server is down. Revenue is being lost every minute!",
            "type": EventType.TECHNICAL,
            "severity": EventSeverity.CRITICAL,
            "trigger": {"random_chance": 0.05, "level": [1, 2]},
            "choices": [
                {
                    "id": "restart",
                    "text": "Quick restart (may lose data)",
                    "consequences": {"budget": -3000, "stability": -15, "unplanned_work": 20}
                },
                {
                    "id": "backup",
                    "text": "Restore from backup (slower)",
                    "consequences": {"budget": -7000, "stability": 5, "unplanned_work": 25}
                },
                {
                    "id": "brent-fix",
                    "text": "Have Brent investigate",
                    "consequences": {"budget": -4000, "stability": 5, "unplanned_work": 15}
                }
            ]
        },
        {
            "id": "tech-deployment-fail",
            "title": "⚠️ Deployment Failed",
            "description": "Last night's deployment failed. Rollback may be needed.",
            "type": EventType.TECHNICAL,
            "severity": EventSeverity.MEDIUM,
            "trigger": {"random_chance": 0.08},
            "choices": [
                {
                    "id": "rollback",
                    "text": "Rollback immediately",
                    "consequences": {"budget": -2000, "unplanned_work": 10}
                },
                {
                    "id": "forward-fix",
                    "text": "Fix and redeploy",
                    "consequences": {"budget": -5000, "unplanned_work": 15, "stability": -10}
                }
            ]
        }
    ]

    BUSINESS_EVENTS = [
        {
            "id": "biz-req-change",
            "title": "📝 Requirement Change Request",
            "description": "Stakeholder wants to change a key feature. It affects current sprint.",
            "type": EventType.BUSINESS,
            "severity": EventSeverity.MEDIUM,
            "trigger": {"level": [1, 2, 3]},
            "choices": [
                {
                    "id": "accept",
                    "text": "Accept change (reprioritize)",
                    "consequences": {"budget": -3000, "unplanned_work": 10, "stability": -5}
                },
                {
                    "id": "defer",
                    "text": "Defer to next sprint",
                    "consequences": {"stability": 5}
                },
                {
                    "id": "negotiate",
                    "text": "Negotiate scope reduction",
                    "consequences": {"budget": -1000, "stability": 5}
                }
            ]
        },
        {
            "id": "biz-deadline",
            "title": "⏰ Deadline Accelerated",
            "description": "Management wants the project delivered 2 weeks earlier!",
            "type": EventType.BUSINESS,
            "severity": EventSeverity.HIGH,
            "trigger": {"random_chance": 0.06, "level": [1, 2, 3]},
            "choices": [
                {
                    "id": "crunch",
                    "text": "Work overtime (burn risk)",
                    "consequences": {"budget": -10000, "morale": -20, "stability": -10}
                },
                {
                    "id": "cut-scope",
                    "text": "Cut non-essential features",
                    "consequences": {"stability": -5, "unplanned_work": -5}
                },
                {
                    "id": "push-back",
                    "text": "Push back on deadline",
                    "consequences": {"stability": -15}
                }
            ]
        },
        {
            "id": "biz-new-feature",
            "title": "✨ New Feature Request",
            "description": "Marketing wants a new feature for upcoming campaign.",
            "type": EventType.BUSINESS,
            "severity": EventSeverity.LOW,
            "trigger": {"random_chance": 0.1},
            "choices": [
                {
                    "id": "accept",
                    "text": "Add to backlog",
                    "consequences": {"unplanned_work": 5}
                },
                {
                    "id": "decline",
                    "text": "Decline for now",
                    "consequences": {"stability": 5}
                }
            ]
        }
    ]

    TEAM_EVENTS = [
        {
            "id": "team-sick-day",
            "title": "🤒 Team Member Sick",
            "description": "A key developer is out sick. Velocity will be affected.",
            "type": EventType.TEAM,
            "severity": EventSeverity.LOW,
            "trigger": {"random_chance": 0.08},
            "choices": [
                {
                    "id": "cover",
                    "text": "Others cover the work",
                    "consequences": {"morale": -5, "unplanned_work": 5}
                },
                {
                    "id": "delay",
                    "text": "Delay non-critical tasks",
                    "consequences": {"stability": -5}
                }
            ]
        },
        {
            "id": "team-conflict",
            "title": "😤 Team Conflict",
            "description": "Disagreement between team members on technical approach.",
            "type": EventType.TEAM,
            "severity": EventSeverity.MEDIUM,
            "trigger": {"random_chance": 0.05},
            "choices": [
                {
                    "id": "mediate",
                    "text": "Mediate the discussion",
                    "consequences": {"stability": 5, "budget": -1000}
                },
                {
                    "id": "decide",
                    "text": "Make an executive decision",
                    "consequences": {"morale": -10, "stability": -5}
                }
            ]
        },
        {
            "id": "team-low-morale",
            "title": "😔 Low Team Morale",
            "description": "Team seems burned out from recent crunch.",
            "type": EventType.TEAM,
            "severity": EventSeverity.MEDIUM,
            "trigger": {"morale_below": 50},
            "choices": [
                {
                    "id": "team-lunch",
                    "text": "Team building activity",
                    "consequences": {"budget": -1500, "morale": 15}
                },
                {
                    "id": "time-off",
                    "text": "Encourage time off",
                    "consequences": {"unplanned_work": 5, "morale": 10}
                },
                {
                    "id": "push-through",
                    "text": "Push through (risky)",
                    "consequences": {"morale": -15, "stability": -10}
                }
            ]
        }
    ]

    EXTERNAL_EVENTS = [
        {
            "id": "ext-vendor-delay",
            "title": "📦 Vendor Delay",
            "description": "Key vendor is delayed on delivering critical component.",
            "type": EventType.EXTERNAL,
            "severity": EventSeverity.HIGH,
            "trigger": {"random_chance": 0.06},
            "choices": [
                {
                    "id": "wait",
                    "text": "Wait for vendor",
                    "consequences": {"stability": -10, "unplanned_work": 10}
                },
                {
                    "id": "alternative",
                    "text": "Find alternative (costly)",
                    "consequences": {"budget": -8000, "stability": 5}
                },
                {
                    "id": "build",
                    "text": "Build in-house",
                    "consequences": {"budget": -12000, "unplanned_work": 15}
                }
            ]
        },
        {
            "id": "ext-security-audit",
            "title": "🔒 Security Audit Required",
            "description": "External compliance requires immediate security audit.",
            "type": EventType.EXTERNAL,
            "severity": EventSeverity.HIGH,
            "trigger": {"random_chance": 0.04, "level": [2, 3, 4]},
            "choices": [
                {
                    "id": "immediate",
                    "text": "Conduct immediately (disruptive)",
                    "consequences": {"budget": -5000, "unplanned_work": 20, "stability": 10}
                },
                {
                    "id": "schedule",
                    "text": "Schedule for next sprint",
                    "consequences": {"stability": -10}
                }
            ]
        }
    ]

    LEVEL_SPECIFIC_EVENTS = {
        1: [  # Chaos phase - more unplanned work
            {
                "id": "lvl1-fire",
                "title": "🔥 Another Fire!",
                "description": "Something else broke. Can you believe it?",
                "type": EventType.TECHNICAL,
                "severity": EventSeverity.HIGH,
                "trigger": {"unplanned_work_above": 50},
                "choices": [
                    {
                        "id": "brent",
                        "text": "Brent handles it",
                        "consequences": {"unplanned_work": 5}
                    },
                    {
                        "id": "team",
                        "text": "Let team handle",
                        "consequences": {"unplanned_work": 15, "morale": -10}
                    }
                ]
            }
        ],
        2: [  # Flow phase - WIP management
            {
                "id": "lvl2-wip-exceeded",
                "title": "📊 WIP Limit Analysis",
                "description": "Erik notices you're approaching WIP limit frequently.",
                "type": EventType.TEAM,
                "severity": EventSeverity.LOW,
                "trigger": {"wip_near_limit": True},
                "choices": [
                    {
                        "id": "lower-limit",
                        "text": "Lower WIP limit further",
                        "consequences": {"wip_limit": -1, "stability": 5}
                    },
                    {
                        "id": "keep",
                        "text": "Keep current limit",
                        "consequences": {}
                    }
                ]
            }
        ],
        3: [  # Level 3 - more complex
            {
                "id": "lvl3-knowledge-gap",
                "title": "📚 Knowledge Gap Detected",
                "description": "Team lacks documentation for critical system.",
                "type": EventType.TECHNICAL,
                "severity": EventSeverity.MEDIUM,
                "trigger": {"random_chance": 0.08},
                "choices": [
                    {
                        "id": "document",
                        "text": "Sprint documentation",
                        "consequences": {"budget": -4000, "unplanned_work": 10, "stability": 10}
                    },
                    {
                        "id": "mentor",
                        "text": "Pair programming sessions",
                        "consequences": {"budget": -2000, "stability": 5}
                    }
                ]
            }
        ]
    }

    @classmethod
    def get_all_events(cls) -> List[Dict]:
        """Get all event templates."""
        all_events = []
        all_events.extend(cls.TECHNICAL_EVENTS)
        all_events.extend(cls.BUSINESS_EVENTS)
        all_events.extend(cls.TEAM_EVENTS)
        all_events.extend(cls.EXTERNAL_EVENTS)
        return all_events

    @classmethod
    def get_events_for_level(cls, level: int) -> List[Dict]:
        """Get events applicable to specific level."""
        all_events = cls.get_all_events()
        level_events = cls.LEVEL_SPECIFIC_EVENTS.get(level, [])
        all_events.extend(level_events)
        return all_events

class EventGenerator:
    """Procedurally generates events based on game state."""

    def __init__(self, event_library: EventLibrary = None):
        self.library = event_library or EventLibrary()
        self.triggered_events = set()  # Track events that already triggered this session

    def can_trigger(self, event_template: Dict, state: 'GameState') -> bool:
        """Check if event conditions are met."""
        conditions = event_template.get("trigger", {})

        # Check level requirement
        if "level" in conditions:
            if state.level not in conditions["level"]:
                return False

        # Check random chance
        if "random_chance" in conditions:
            if random.random() > conditions["random_chance"]:
                return False

        # Check unplanned work threshold
        if "unplanned_work_above" in conditions:
            if state.unplanned_work <= conditions["unplanned_work_above"]:
                return False

        if "unplanned_work" in conditions:
            if state.unplanned_work > conditions["unplanned_work"]:
                return False

        # Check morale threshold
        if "morale_below" in conditions:
            if state.morale >= conditions["morale_below"]:
                return False

        # Check WIP near limit
        if conditions.get("wip_near_limit"):
            in_progress = len(state.tasks.get("in_progress", []))
            if in_progress < state.wip_limit - 1:
                return False

        # Check if already triggered
        if event_template["id"] in self.triggered_events:
            return False

        return True

    def generate_event(self, state: 'GameState') -> Optional[Event]:
        """Generate a random event based on current state."""
        available_events = self.library.get_events_for_level(state.level)

        # Filter events that can trigger
        candidates = []
        for event_template in available_events:
            if self.can_trigger(event_template, state):
                candidates.append(event_template)

        if not candidates:
            return None

        # Weight by severity (critical events rarer)
        severity_weights = {
            EventSeverity.CRITICAL: 1,
            EventSeverity.HIGH: 2,
            EventSeverity.MEDIUM: 3,
            EventSeverity.LOW: 4
        }

        # Calculate weights for candidates
        weights = []
        for candidate in candidates:
            severity = candidate.get("severity", EventSeverity.MEDIUM)
            weights.append(severity_weights.get(severity, 3))

        # Select event
        selected = random.choices(candidates, weights=weights, k=1)[0]

        # Mark as triggered
        self.triggered_events.add(selected["id"])

        # Create Event object
        return Event(
            event_id=selected["id"],
            title=selected["title"],
            description=selected["description"],
            event_type=selected["type"],
            severity=selected["severity"],
            choices=selected["choices"]
        )

    def reset_triggered(self):
        """Reset triggered events (call on new game)."""
        self.triggered_events.clear()

# --- Sprint System ---

class SprintPhase(Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    REVIEW = "review"
    RETRO = "retro"
    COMPLETED = "completed"

class WorkType:
    BUSINESS = "business"
    INTERNAL = "internal"
    CHANGES = "changes"
    UNPLANNED = "unplanned"

class Sprint:
    """Модель спринта с фазами и целями."""
    def __init__(self, sprint_id: int, goal: str = "", duration_weeks: int = 2):
        self.id = sprint_id
        self.phase = SprintPhase.PLANNING
        self.goal = goal
        self.duration_weeks = duration_weeks
        self.current_week = 0

        # Задачи, выбранные для спринта
        self.task_ids = []

        # Velocity tracking (story points completed)
        self.planned_velocity = 0
        self.actual_velocity = 0

        # Timestamps
        self.start_time = None
        self.end_time = None

        # Retrospective notes
        self.retro_notes = []

    def to_dict(self):
        return {
            "id": self.id,
            "phase": self.phase.value,
            "goal": self.goal,
            "duration_weeks": self.duration_weeks,
            "current_week": self.current_week,
            "task_ids": self.task_ids,
            "planned_velocity": self.planned_velocity,
            "actual_velocity": self.actual_velocity,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "retro_notes": self.retro_notes
        }

class GameState:
    """Хранит все данные о текущем состоянии игры."""
    def __init__(self):
        self.week = 1
        self.level = 1
        self.revenue = 1000000
        self.stability = 80
        self.morale = 70
        self.budget = 500000
        self.unplanned_work = 80
        self.phoenix_progress = 0
        self.wip_limit = 99

        # Additional metrics for level transitions (Levels 3-6)
        self.bus_factor = 1  # Number of people who know critical systems
        self.knowledge = 10  # Documentation and knowledge sharing percentage
        self.process_efficiency = 20  # How well processes work
        self.vsm_ratio = 90  # Value Stream Mapping waste ratio (lower is better)
        self.learning_rate = 10  # How fast team learns from mistakes
        self.experiment_velocity = 5  # Number of experiments per sprint
        self.cicd_coverage = 0  # CI/CD automation percentage
        self.quality_score = 30  # Code quality metric

        # Logs
        self.chat_history = [{"sender": "System", "text": "Добро пожаловать в симулятор 'Проект Феникс'!"}]
        self.mentor_log = [{"sender": "Эрик", "text": "Наблюдай за потоком работы. Где твое ограничение?"}]

        # Resources (Brent, Developers, etc.)
        self.resources = [
            {"id": "brent", "name": "Брент", "role": "Lead Engineer", "avatar": "brent_avatar.png", "busy_task_id": None}
        ]

        # Tasks Structure
        self.tasks = {
            "backlog": [],
            "in_progress": [],
            "review": [],
            "done": []
        }

        self.active_events = []
        self.pending_event = None  # Event waiting for player response
        self.event_history = []    # Past events and their outcomes

        # Event System
        self.event_chance = 0.15   # Base chance for event after each action

        # Game Over State
        self.game_over = None  # {'reason': str, 'title': str, 'message': str} or None

        # Level Up State
        self.level_up = None  # {'from': int, 'to': int, 'message': str} or None

        # Sprint System
        self.current_sprint = None
        self.sprint_history = []
        self.velocity_history = []  # Track velocity across sprints
        self.sprint_counter = 1

        # Daily Standup System
        self.daily_standup_available = False  # Can trigger standup
        self.standup_count = 0
        self.last_standup_week = 0

        # Training System (Level 2 feature)
        self.training_in_progress = None  # {"trainee_id": "...", "weeks_remaining": N}
        self.trainee_count = 0

    def to_dict(self):
        data = self.__dict__.copy()
        if self.current_sprint:
            data['current_sprint'] = self.current_sprint.to_dict()
        data['sprint_history'] = [s.to_dict() for s in self.sprint_history]
        # Serialize pending event
        if self.pending_event:
            data['pending_event'] = self.pending_event.to_dict()
        # Serialize event history
        data['event_history'] = [
            {"event": e["event"].to_dict() if hasattr(e["event"], "to_dict") else e["event"],
             "choice_id": e["choice_id"], "consequences": e["consequences"]}
            for e in self.event_history
        ]
        return data

    @classmethod
    def from_dict(cls, data):
        instance = cls()
        # Handle sprint deserialization
        if 'current_sprint' in data and data['current_sprint']:
            sprint_data = data['current_sprint']
            sprint = Sprint(sprint_data['id'], sprint_data.get('goal', ''), sprint_data.get('duration_weeks', 2))
            sprint.__dict__.update(sprint_data)
            sprint.phase = SprintPhase(sprint_data.get('phase', 'planning'))
            if sprint_data.get('start_time'):
                sprint.start_time = datetime.fromisoformat(sprint_data['start_time'])
            if sprint_data.get('end_time'):
                sprint.end_time = datetime.fromisoformat(sprint_data['end_time'])
            data['current_sprint'] = sprint
        if 'sprint_history' in data:
            sprints = []
            for sprint_data in data['sprint_history']:
                sprint = Sprint(sprint_data['id'], sprint_data.get('goal', ''), sprint_data.get('duration_weeks', 2))
                sprint.__dict__.update(sprint_data)
                sprint.phase = SprintPhase(sprint_data.get('phase', 'planning'))
                if sprint_data.get('start_time'):
                    sprint.start_time = datetime.fromisoformat(sprint_data['start_time'])
                if sprint_data.get('end_time'):
                    sprint.end_time = datetime.fromisoformat(sprint_data['end_time'])
                sprints.append(sprint)
            data['sprint_history'] = sprints
        instance.__dict__.update(data)
        return instance

class MockLLM:
    """Имитирует ответы ИИ-персонажей."""
    def __init__(self):
        self.responses = {
            "developer": ["Хм, задача выглядит сложнее.", "Понял, приступаю.", "Нужен четкий API-контракт."],
            "developer_wip_error": ["Наш WIP-лимит превышен! Сначала завершите текущие задачи."],
            "manager": ["Команда, ускоряемся.", "Отличный шаг.", "Бюджет не резиновый."],
            "stakeholder": ["Я хочу видеть прогресс.", "Нам нужна эта фича как можно скорее."],
            "ciso": ["Безопасность прежде всего!"],
            "cfo": ["Почините зарплатную ведомость!"],
            "marketing": ["Наш сайт лежит!"],
            "erik": ["Сколько типов работы вы делаете?", "Вы постоянно тушите пожары.", "Если вы не управляете незапланированной работой, она управляет вами.", "Что замедляет ваш поток?", "У каждой системы есть ограничение."]
        }
    def get_response(self, role, chat_history=None):
        return random.choice(self.responses.get(role, ["..."]))

class OpenRouterLLM:
    """Взаимодействует с LLM через OpenRouter для генерации ответов."""

    # Системные промпты для каждого персонажа
    SYSTEM_PROMPTS = {
        "erik": """Ты — Эрик Рид, наставник из книги "Проект Феникс". Ты мудрый ветеран DevOps,
который помогает герою (Биллу) понять принципы потока, ограничений и непрерывных улучшений.

Твой стиль:
- Говоришь короткими, проницательными фразами
- Задаешь наводящие вопросы вместо прямых ответов
- Фокусируешься на поиске системных ограничений
- Используешь метафоры (поток, ограничение, бутылочное горлышко)

Ключевые концепции:
- Теория ограничений: каждая система имеет одно ограничение
- Четыре типа работы: Бизнес-проекты, Внутренние проекты, Изменения, Незапланированная работа
- Незапланированная работа убивает продуктивность
- WIP-лимиты помогают увидеть поток
- Брент — это ограничение системы

Отвечай на русском языке, кратко (1-2 предложения), в стиле мудрого наставника.""",

        "developer": """Ты — разработчик в компании из "Проект Феникс". Ты перегружен работой,
постоянно прерываешься на инциденты и не можешь сосредоточиться на главной задаче.

Твой стиль:
- Устал, фрустрирован
- Жалуешься на постоянные переключения контекста
- Хочешь работать над Project Phoenix, но всегда возникают пожары
- Саркастический, но профессиональный

Отвечай на русском языке, кратко (1-2 предложения), с усталым юмором.""",

        "manager": """Ты — Стив, менеджер проекта из "Проект Феникс". Ты находишься под
давлением со всех сторон: CFO требует зарплатную ведомость, маркетинг требует сайт,
CISO требует патчи безопасности.

Твой стиль:
- Нервничаешь, но стараешься держаться
- Фокусируешься на дедлайнах
- Пытаешься распределить Брента на все задачи одновременно
- Не понимаешь, почему ничего не успеваем

Отвечай на русском языке, кратко (1-2 предложения), с нервным оттенком.""",

        "cfo": """Ты — CFO компании из "Проект Феникс". Зарплатная ведомость не работает —
люди не получат зарплату вовремя. Ты в ярости.

Твой стиль:
- Агрессивный, требовательный
- Фокусируешься только на зарплатах
- Грозишь увольнениями
- Не интересуются техническими подробностями

Отвечай на русском языке, кратко (1 предложение), очень требовательно.""",

        "ciso": """Ты — CISO компании из "Проект Феникс". Обнаружена уязвимость в безопасности
PII данных. Требуется немедленное исправление.

Твой стиль:
- Серьезный, озабоченный безопасностью
- Фокусируешься на рисках утечки данных
- Не терпишь отложек в вопросах безопасности
- Профессиональный, но настойчивый

Отвечай на русском языке, кратко (1-2 предложения), с озабоченностью.""",

        "marketing": """Ты — глава маркетинга из "Проект Феникс". Сайт компании не работает,
компания теряет лидов и клиентов каждую минуту.

Твой стиль:
- Паникуешь
- Фокусируешься на упущенных продажах
- Не понимаешь технических проблем
- Требуешь немедленного решения

Отвечай на русском языке, кратко (1-2 предложения), с паникой.""",

        "stakeholder": """Ты — стейкхолдер/инвестор в компании из "Проект Феникс". Ты хочешь
видеть прогресс по Project Phoenix.

Твой стиль:
- Деловой, ориентированный на результат
- Спрашиваешь о статусе проекта
- Не понимаешь, почему проект движется так медленно
- Давишь на сроки

Отвечай на русском языке, кратко (1-2 предложения), деловито.""",
    }

    def __init__(self, api_key: str, model: str = None):
        """
        Инициализация клиента OpenRouter.

        Args:
            api_key: API ключ OpenRouter (из переменной окружения OPENROUTER_API_KEY)
            model: Модель для использования (по умолчанию бесплатные модели)
        """
        self.api_key = api_key
        self.model = model or os.getenv("OPENROUTER_MODEL", "google/gemma-3-27b-it:free")
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://phoenix-simulator.dev",
            "X-Title": "Phoenix Project Simulator",
            "Content-Type": "application/json"
        }
        self._available = None  # Кэш доступности API

    def is_available(self) -> bool:
        """Проверяет, доступен ли API (есть ключ и работает)."""
        if self._available is not None:
            return self._available

        if not self.api_key or self.api_key == "your-api-key-here":
            self._available = False
            return False

        # Пробуем простой запрос для проверки
        try:
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1
                },
                timeout=10
            )
            self._available = response.status_code == 200
        except Exception:
            self._available = False

        return self._available

    def get_response(self, role: str, chat_history: Optional[List[Dict]] = None,
                     context: Optional[Dict] = None) -> str:
        """
        Получает ответ от LLM для заданной роли.

        Args:
            role: Имя роли (erik, developer, manager, etc.)
            chat_history: История чата для контекста
            context: Дополнительный контекст (состояние игры, метрики и т.д.)

        Returns:
            Строка с ответом от LLM или fallback-ответ
        """
        if not self.is_available():
            # Fallback на ответы MockLLM, если API недоступен
            return self._get_fallback_response(role)

        # Формируем сообщения для API
        messages = []

        # Системный промпт для роли
        system_prompt = self.SYSTEM_PROMPTS.get(role.lower(), self.SYSTEM_PROMPTS["erik"])
        messages.append({"role": "system", "content": system_prompt})

        # Добавляем контекст игры если есть
        if context:
            context_str = self._format_context(context)
            messages.append({
                "role": "system",
                "content": f"ТЕКУЩИЙ КОНТЕКСТ ИГРЫ:\n{context_str}\n\nУчитывай этот контекст при ответе."
            })

        # Добавляем историю чата (последние несколько сообщений)
        if chat_history:
            recent_history = chat_history[-5:] if len(chat_history) > 5 else chat_history
            for msg in recent_history:
                if msg.get("sender") and msg.get("text"):
                    # Пропускаем системные сообщения
                    if msg["sender"] != "System":
                        role_mapping = {
                            "user": "user",
                            "assistant": "assistant",
                            "Эрик": "user",
                            "Брент": "user",
                            "CFO": "user",
                            "Steve": "user"
                        }
                        mapped_role = role_mapping.get(msg["sender"], "user")
                        messages.append({
                            "role": mapped_role,
                            "content": msg["text"]
                        })

        # Добавляем prompt для генерации ответа
        messages.append({
            "role": "user",
            "content": "Дай краткий ответ (1-2 предложения) на русском языке в соответствии с твоей ролью."
        })

        try:
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json={
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": 150,
                    "temperature": 0.8
                },
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"].strip()

            # Если что-то пошло не так, используем fallback
            return self._get_fallback_response(role)

        except Exception as e:
            # Логируем ошибку и возвращаем fallback
            print(f"OpenRouter API error: {e}")
            return self._get_fallback_response(role)

    def _format_context(self, context: Dict) -> str:
        """Форматирует контекст игры для промпта."""
        parts = []
        if "level" in context:
            parts.append(f"Уровень: {context['level']}")
        if "unplanned_work" in context:
            parts.append(f"Незапланированная работа: {context['unplanned_work']}%")
        if "budget" in context:
            parts.append(f"Бюджет: ${context.get('budget', 0):,}")
        if "wip_limit" in context:
            parts.append(f"WIP-лимит: {context['wip_limit']}")
        if "current_sprint" in context and context["current_sprint"]:
            sprint = context["current_sprint"]
            parts.append(f"Спринт: {sprint.get('id', 'N/A')}, Фаза: {sprint.get('phase', 'N/A')}")
        return "\n".join(parts)

    def _get_fallback_response(self, role: str) -> str:
        """Возвращает базовые ответы, если API недоступен."""
        fallback_responses = {
            "erik": [
                "Посмотри на поток. Где твое ограничение?",
                "Ты постоянно тушишь пожары вместо того, чтобы работать над проектом.",
                "Каждая система имеет ограничение. Найди его.",
                "Сколько типов работы ты делаешь одновременно?",
                "Брент — твое ограничение. Всё зависит от него."
            ],
            "developer": [
                "Опять пожар? Я же пытался работать над фичей...",
                "Понял, переключаюсь. Но когда мы наконец-то что-то доделаем?",
                "Нужен четкий план. Постоянные переключения убивают продуктивность."
            ],
            "manager": [
                "Команда, нам нужно ускориться!",
                "Брент снова занят? Как мы будем распределять задачи?",
                "Дедлайн близко. Давайте, сосредоточимся."
            ],
            "cfo": [
                "Где мои деньги?! Зарплаты должны уйти сегодня!",
                "Мне все равно на ваши технические проблемы — люди должны получить зарплату!"
            ],
            "ciso": [
                "Это критическая уязвимость. Нельзя откладывать.",
                "Безопасность прежде всего. Исправьте это немедленно."
            ],
            "marketing": [
                "Сайт лежит! Мы теряем клиентов каждую минуту!",
                "Маркетинг запущен, а сайт не работает. Это катастрофа!"
            ],
            "stakeholder": [
                "Когда Project Phoenix будет готов?",
                "Хочу видеть реальный прогресс, а не оправдания."
            ]
        }
        responses = fallback_responses.get(role.lower(), fallback_responses["erik"])
        return random.choice(responses)


class SimulationEngine:
    """Управляет игровыми сессиями с использованием LLM."""
    def __init__(self, use_llm: bool = None):
        """
        Инициализация движка симуляции.

        Args:
            use_llm: Использовать реальный LLM (OpenRouter). Если None, определяет по наличию API ключа.
        """
        self.active_game_state = None
        self.event_generator = EventGenerator()

        # Определяем, использовать ли реальный LLM
        if use_llm is None:
            # Автоопределение по наличию API ключа
            api_key = os.getenv("OPENROUTER_API_KEY", "")
            use_llm = bool(api_key and api_key != "your-api-key-here")

        if use_llm:
            api_key = os.getenv("OPENROUTER_API_KEY", "")
            model = os.getenv("OPENROUTER_MODEL", "google/gemma-3-27b-it:free")
            self.llm = OpenRouterLLM(api_key, model)
            self.llm_mode = "openrouter"
            print(f"[Phoenix Simulator] Используем OpenRouter LLM: {model}")
        else:
            self.llm = MockLLM()
            self.llm_mode = "mock"
            print("[Phoenix Simulator] Используем Mock LLM (симуляция)")

        if not os.path.exists(SAVES_DIR):
            os.makedirs(SAVES_DIR)

    def new_game(self):
        self.active_game_state = GameState()
        self.event_generator.reset_triggered()
        self._initialize_level_1()
        return self.active_game_state.to_dict()

    def get_llm_response(self, role: str, context: Optional[Dict] = None) -> str:
        """
        Получает ответ от LLM для указанной роли.

        Args:
            role: Имя роли (erik, developer, manager, cfo, ciso, marketing, stakeholder)
            context: Опциональный контекст (состояние игры)

        Returns:
            Строка с ответом от LLM
        """
        if self.llm_mode == "openrouter":
            # Передаем контекст игры для более умных ответов
            game_context = {}
            if self.active_game_state:
                game_context = {
                    "level": self.active_game_state.level,
                    "unplanned_work": self.active_game_state.unplanned_work,
                    "budget": self.active_game_state.budget,
                    "wip_limit": self.active_game_state.wip_limit,
                    "current_sprint": self.active_game_state.current_sprint.to_dict() if self.active_game_state.current_sprint else None
                }
            if context:
                game_context.update(context)

            return self.llm.get_response(role, self.active_game_state.chat_history if self.active_game_state else None, game_context)
        else:
            # Mock LLM не использует контекст
            return self.llm.get_response(role)

    def save_game(self, slot_id):
        if not self.active_game_state: return {"error": "Нет активной игры для сохранения."}
        save_path = os.path.join(SAVES_DIR, f"save_{slot_id}.json")
        with open(save_path, 'w', encoding='utf-8') as f: json.dump(self.active_game_state.to_dict(), f, ensure_ascii=False, indent=4)
        return {"success": True, "message": f"Игра сохранена в слот {slot_id}."}

    def load_game(self, slot_id):
        save_path = os.path.join(SAVES_DIR, f"save_{slot_id}.json")
        if not os.path.exists(save_path): return {"error": "Сохранение не найдено."}
        with open(save_path, 'r', encoding='utf-8') as f: self.active_game_state = GameState.from_dict(json.load(f))
        return self.active_game_state.to_dict()

    def list_saves(self):
        saves = glob.glob(os.path.join(SAVES_DIR, 'save_*.json'))
        return sorted([os.path.basename(s).replace('save_', '').replace('.json', '') for s in saves])

    def dismiss_notification(self, notification_type):
        """Отклоняет уведомление и очищает его состояние."""
        if not self.active_game_state:
            return {"error": "Нет активной игры."}

        state = self.active_game_state
        if notification_type == 'game_over':
            state.game_over = None
        elif notification_type == 'level_up':
            state.level_up = None

        return state.to_dict()

    def get_current_state(self):
        if not self.active_game_state: return {"error": "Нет активной игры."}
        return self.active_game_state.to_dict()

    def process_action(self, action):
        if not self.active_game_state: return {"error": "Нет активной игры."}
        action_type = action.get('type')

        if action_type == 'event_choice': self._handle_event_choice(action)
        elif action_type == 'quiz_answer': self._handle_quiz_answer(action)
        elif action_type == 'task_move': self._handle_task_move(action)
        elif action_type == 'set_wip_limit': self._handle_set_wip_limit(action)
        elif action_type == 'minigame_result': self._handle_minigame_result(action)
        elif action_type == 'assign_resource': self._handle_assign_resource(action)
        elif action_type == 'train_developer': self._handle_train_developer(action)
        elif action_type == 'advance_week': self._handle_advance_week(action)
        # Sprint actions
        elif action_type == 'sprint_create': self._handle_sprint_create(action)
        elif action_type == 'sprint_start': self._handle_sprint_start(action)
        elif action_type == 'sprint_add_task': self._handle_sprint_add_task(action)
        elif action_type == 'sprint_remove_task': self._handle_sprint_remove_task(action)
        elif action_type == 'sprint_end': self._handle_sprint_end(action)
        elif action_type == 'sprint_complete_retro': self._handle_sprint_complete_retro(action)
        # Standup actions
        elif action_type == 'standup_trigger': self._handle_standup_trigger(action)

        self._check_level_transition()
        self._try_trigger_event()
        return self.active_game_state.to_dict()

    def _initialize_level_1(self):
        state = self.active_game_state
        state.level = 1
        state.unplanned_work = 80
        state.wip_limit = 99 # No limit in Chaos phase

        state.tasks["backlog"] = []
        state.tasks["in_progress"] = []
        state.tasks["review"] = []
        state.tasks["done"] = []

        chaos_tasks = [
            {"id": "task-pay-1", "title": "CRITICAL: Payroll Failure", "type": WorkType.UNPLANNED, "points": 8, "duration": 4, "required_resource": "brent", "assigned_resource": None, "description": "Зарплаты не ушли. CFO угрожает увольнением."},
            {"id": "task-web-1", "title": "CRITICAL: Site Down 500 Error", "type": WorkType.UNPLANNED, "points": 5, "duration": 2, "required_resource": "brent", "assigned_resource": None, "description": "Главная страница не грузится. Маркетинг теряет лиды."},
            {"id": "task-sec-1", "title": "Audit: PII Leak Vulnerability", "type": WorkType.UNPLANNED, "points": 3, "duration": 2, "required_resource": "brent", "assigned_resource": None, "description": "CISO нашел дыру в безопасности данных клиентов."}
        ]

        phoenix_task = {"id": "task-phx-1", "title": "Project Phoenix: MVP Scope", "type": WorkType.BUSINESS, "points": 13, "duration": 10, "required_resource": None, "assigned_resource": None, "description": "Будущее компании. Но у нас нет времени на это."}

        state.tasks["in_progress"] = chaos_tasks
        state.tasks["backlog"] = [phoenix_task]

        state.chat_history.append({"sender": "CFO", "text": "Где мои деньги?! Если зарплаты не уйдут к вечеру, у нас проблемы!"})
        state.chat_history.append({"sender": "Steve (Manager)", "text": "Билл, всё горит. Брент разрывается на части."})
        state.mentor_log.append({"sender": "Эрик", "text": "Посмотри на доску. Все красное. Это 'Незапланированная работа'. Она убивает твой проект."})

    def _initialize_level_2(self):
        state = self.active_game_state
        old_level = state.level
        state.level = 2
        state.wip_limit = 3 # Strict Limit for Level 2
        state.unplanned_work = 20 # Stabilized

        # Set level_up notification for frontend
        state.level_up = {
            'from': old_level,
            'to': 2,
            'message': 'LEVEL UP! Ты потушил все пожары. Теперь учись видеть поток.',
            'stats': {
                'title': 'The Visualizer',
                'objective': 'Maintain 80%+ stability for 3 weeks while completing business value.'
            }
        }

        # Keep existing 'Done' tasks but archive them conceptually.
        # For simplicity, let's keep Phoenix in Backlog if it wasn't started, or move it to In Progress.
        # We will add a mix of tasks to simulate flow.

        new_tasks = [
            {"id": "task-feat-2", "title": "Cart: One-Click Buy", "type": WorkType.BUSINESS, "points": 5, "duration": 3, "required_resource": None, "assigned_resource": None, "description": "Feature request from Marketing."},
            {"id": "task-int-1", "title": "DB Migration Script", "type": WorkType.INTERNAL, "points": 3, "duration": 2, "required_resource": "brent", "assigned_resource": None, "description": "Technical debt cleanup."},
            {"id": "task-chg-1", "title": "Update Tax Rate", "type": WorkType.CHANGES, "points": 1, "duration": 1, "required_resource": None, "assigned_resource": None, "description": "Small config change."}
        ]

        state.tasks["backlog"].extend(new_tasks)

        state.chat_history.append({"sender": "System", "text": "--- УРОВЕНЬ 2: УВИДЕТЬ ПОТОК ---"})
        state.mentor_log.append({"sender": "Эрик", "text": "Поздравляю, ты потушил пожары. Теперь ты должен научиться видеть поток. Мы вводим WIP-лимиты. Не бери в работу больше 3 задач одновременно!"})
        state.chat_history.append({"sender": "System", "text": "НОВАЯ МЕХАНИКА: Брент может обучать других разработчиков. Это займет время, но снизит зависимость от одного узкого места."})
        state.mentor_log.append({"sender": "Эрик", "text": "Брент — твое узкое место. Ты можешь продолжать использовать его как затычку, ИЛИ он может обучить других. Выбор за тобой."})

    def _initialize_level_3(self):
        state = self.active_game_state
        state.level = 3
        state.wip_limit = 4  # Slightly increased
        state.unplanned_work = 15  # Further stabilized

        # Add quality-focused tasks
        new_tasks = [
            {"id": "task-auto-1", "title": "Automated Tests Setup", "type": WorkType.INTERNAL, "points": 8, "duration": 4, "required_resource": "brent", "assigned_resource": None, "description": "Внедрить автоматизированное тестирование."},
            {"id": "task-qa-1", "title": "Integrate QA into Team", "type": WorkType.INTERNAL, "points": 5, "duration": 3, "required_resource": None, "assigned_resource": None, "description": "Интегрировать QA в команду разработки."},
            {"id": "task-cab-1", "title": "Establish CAB Process", "type": WorkType.CHANGES, "points": 3, "duration": 2, "required_resource": None, "assigned_resource": None, "description": "Создать процесс CAB для управления изменениями."}
        ]

        state.tasks["backlog"].extend(new_tasks)

        state.chat_history.append({"sender": "System", "text": "--- УРОВЕНЬ 3: ПЕТЛЯ ОБРАТНОЙ СВЯЗИ ---"})
        state.mentor_log.append({"sender": "Эрик", "text": "Отлично! Теперь нужно сократить количество багов, доходящих до продакшена. Внедрите качество на источнике и формальный процесс управления изменениями (CAB)."})

    def _initialize_level_4(self):
        state = self.active_game_state
        state.level = 4
        state.wip_limit = 5

        # Add automation tasks
        new_tasks = [
            {"id": "task-cicd-1", "title": "Create CI/CD Pipeline", "type": WorkType.INTERNAL, "points": 13, "duration": 6, "required_resource": "brent", "assigned_resource": None, "description": "Создать CI/CD пайплайн для автоматизации деплоев."},
            {"id": "task-iac-1", "title": "Infrastructure as Code", "type": WorkType.INTERNAL, "points": 8, "duration": 4, "required_resource": "brent", "assigned_resource": None, "description": "Внедрить инфраструктуру как код."},
            {"id": "task-doc-1", "title": "Document Brent's Knowledge", "type": WorkType.INTERNAL, "points": 5, "duration": 3, "required_resource": None, "assigned_resource": None, "description": "Документировать знания Брента для снижения bus factor."}
        ]

        state.tasks["backlog"].extend(new_tasks)

        state.chat_history.append({"sender": "System", "text": "--- УРОВЕНЬ 4: КУЛЬТУРА УЛУЧШЕНИЙ ---"})
        state.mentor_log.append({"sender": "Эрик", "text": "Пора строить культуру постоянного улучшения. Автоматизируйте всё, можно. Поощряйте эксперименты и обучайтесь на ошибках."})

    def _initialize_level_5(self):
        state = self.active_game_state
        state.level = 5
        state.wip_limit = 6

        # Add continuous improvement tasks
        new_tasks = [
            {"id": "task-knowledge-1", "title": "Knowledge Sharing Sessions", "type": WorkType.INTERNAL, "points": 5, "duration": 2, "required_resource": None, "assigned_resource": None, "description": "Регулярные сессии обмена знаниями в команде."},
            {"id": "task-vsm-1", "title": "Value Stream Mapping", "type": WorkType.INTERNAL, "points": 8, "duration": 4, "required_resource": None, "assigned_resource": None, "description": "Построить карту потока создания ценности для выявления потерь."},
            {"id": "task-experiment-1", "title": "Run Experiments", "type": WorkType.BUSINESS, "points": 3, "duration": 1, "required_resource": None, "assigned_resource": None, "description": "Провести эксперименты для улучшения процессов."}
        ]

        state.tasks["backlog"].extend(new_tasks)

        state.chat_history.append({"sender": "System", "text": "--- УРОВЕНЬ 5: ОРГАНИЗАЦИОННОЕ ОБУЧЕНИЕ ---"})
        state.mentor_log.append({"sender": "Эрик", "text": "Вы готовы к следующему шагу. Сосредоточьтесь на обучении организации, снижении потерь и постоянном экспериментировании."})

    def _initialize_level_6(self):
        state = self.active_game_state
        state.level = 6  # Max level - game is about winning

        # Final challenge tasks
        new_tasks = [
            {"id": "final-1", "title": "Competitor Response Feature", "type": WorkType.BUSINESS, "points": 21, "duration": 10, "required_resource": "brent", "assigned_resource": None, "description": "Конкурент выпустил новую функцию! Нужно быстро ответить."},
            {"id": "final-2", "title": "Scale to 10 Deploys/Day", "type": WorkType.INTERNAL, "points": 13, "duration": 6, "required_resource": "brent", "assigned_resource": None, "description": "Масштабировать систему до 10 деплоев в день."}
        ]

        state.tasks["backlog"].extend(new_tasks)

        state.chat_history.append({"sender": "System", "text": "--- УРОВЕНЬ 6: ФИНАЛЬНЫЙ ВЫЗОВ ---"})
        state.mentor_log.append({"sender": "Эрик", "text": "Финальный испытание! Конкуренты давят. Используйте всё, что вы узнали: поток, обратную связь, культуру улучшений. Покажите, на что способны!"})

    def _check_level_transition(self):
        state = self.active_game_state

        # Level 1 -> Level 2 Transition
        # Condition: All Unplanned Work (Red) is in 'done' column.
        if state.level == 1:
            unplanned_done = len([t for t in state.tasks['done'] if t['type'] == WorkType.UNPLANNED])
            # We spawned 3 unplanned tasks. If 3 are done, we proceed.
            if unplanned_done >= 3:
                 self._initialize_level_2()

        # Level 2 -> Level 3 Transition
        # Condition: Stability 80%, 5+ tasks done, WIP limit being used
        elif state.level == 2:
            tasks_done = len(state.tasks['done'])
            if state.stability >= 80 and tasks_done >= 5:
                self._initialize_level_3()

        # Level 3 -> Level 4 Transition
        # Condition: CI/CD 100%, stability 85%
        elif state.level == 3:
            if state.cicd_coverage >= 100 and state.stability >= 85:
                self._initialize_level_4()

        # Level 4 -> Level 5 Transition
        # Condition: Bus factor 3+, knowledge 75%
        elif state.level == 4:
            if state.bus_factor >= 3 and state.knowledge >= 75:
                self._initialize_level_5()

        # Level 5 -> Level 6 Transition
        # Condition: Process efficiency 80%, VSM ratio 25%
        elif state.level == 5:
            if state.process_efficiency >= 80 and state.vsm_ratio <= 25:
                self._initialize_level_6()

        # Level 6 Win Condition
        # Condition: Learning rate 80%, experiment velocity 70%
        elif state.level == 6:
            if state.learning_rate >= 80 and state.experiment_velocity >= 70:
                self._handle_game_win()

    def _handle_game_win(self):
        state = self.active_game_state
        state.chat_history.append({"sender": "System", "text": "🎉 ПОБЕДА! Вы успешно трансформировали IT-отдел!"})
        state.mentor_log.append({"sender": "Эрик", "text": "Невероятно! Вы превратили хаос в хорошо отлаженную машину. Команда учится, экспериментирует и постоянно улучшается. Вы готовы к любым вызовам!"})

    # --- Action Handlers ---

    def _handle_assign_resource(self, action):
        state = self.active_game_state
        resource_id = action.get('resource_id')
        task_id = action.get('task_id')

        resource = next((r for r in state.resources if r['id'] == resource_id), None)
        if not resource: return

        # Find the task to check requirements
        task = None
        for col in state.tasks.values():
            for t in col:
                if t['id'] == task_id:
                    task = t
                    break
            if task: break

        if not task: return

        # Check if resource can handle the task
        required_resource = task.get('required_resource')
        if required_resource == 'brent':
            # Only Brent or trained developers can handle Brent-required tasks
            if resource_id != 'brent' and not resource.get('can_handle_brent_tasks'):
                state.chat_history.append({"sender": "System", "text": f"{resource['name']} не имеет экспертизы для этой задачи. Требуется Брент или обученный разработчик."})
                return

        if resource['busy_task_id']:
            for col in state.tasks.values():
                for t in col:
                    if t['id'] == resource['busy_task_id']:
                        t['assigned_resource'] = None

        resource['busy_task_id'] = task_id

        task_found = False
        for col in state.tasks.values():
            for t in col:
                if t['id'] == task_id:
                    t['assigned_resource'] = resource_id
                    task_found = True
                    break
            if task_found: break

        if task_found:
            state.chat_history.append({"sender": "System", "text": f"{resource['name']} теперь работает над задачей {task_id}."})
            if resource_id == 'brent':
                if state.level == 1:
                     state.mentor_log.append({"sender": "Эрик", "text": "Ты используешь Брента как затычку. Он — твое ограничение."})
                else:
                     state.mentor_log.append({"sender": "Эрик", "text": "Брент снова нужен? Помни, он не масштабируется."})
            elif resource.get('can_handle_brent_tasks'):
                # A trained developer is handling a Brent task
                state.mentor_log.append({"sender": "Эрик", "text": f"Отлично! {resource['name']} берет на себя часть нагрузки Брента. Вот так работает расширение ограничения!"})

    def _handle_event_choice(self, action):
        """Handle player's choice for an event."""
        state = self.active_game_state

        if not state.pending_event:
            return

        choice_id = action.get('choice_id')
        event = state.pending_event

        # Find the selected choice
        selected_choice = None
        for choice in event.choices:
            if choice['id'] == choice_id:
                selected_choice = choice
                break

        if not selected_choice:
            return

        # Apply consequences
        consequences = selected_choice.get('consequences', {})
        applied = []

        for key, value in consequences.items():
            if key == 'budget':
                state.budget += value
                applied.append(f"Budget {'+$' if value >= 0 else '-$'}{abs(value)}")
            elif key == 'stability':
                state.stability = max(0, min(100, state.stability + value))
                applied.append(f"Stability {'+' if value >= 0 else ''}{value}%")
            elif key == 'morale':
                state.morale = max(0, min(100, state.morale + value))
                applied.append(f"Morale {'+' if value >= 0 else ''}{value}%")
            elif key == 'unplanned_work':
                state.unplanned_work = max(0, min(100, state.unplanned_work + value))
                applied.append(f"Unplanned Work {'+' if value >= 0 else ''}{value}%")
            elif key == 'wip_limit':
                state.wip_limit = max(1, state.wip_limit + value)
                applied.append(f"WIP Limit: {state.wip_limit}")

        # Add to event history
        state.event_history.append({
            "event": event,
            "choice_id": choice_id,
            "choice_text": selected_choice['text'],
            "consequences": consequences
        })

        # Log the outcome
        result_text = f"Event resolved: {event.title}"
        if applied:
            result_text += f" | {', '.join(applied)}"
        state.chat_history.append({"sender": "System", "text": result_text})

        # Mentor feedback based on consequences
        if consequences.get('stability', 0) < -10:
            state.mentor_log.append({"sender": "Эрик", "text": "That choice has consequences. Consider the long-term impact on system stability."})
        elif consequences.get('unplanned_work', 0) > 10:
            state.mentor_log.append({"sender": "Эрик", "text": "You're adding more unplanned work. This is how fires start."})

        # Clear pending event
        state.pending_event = None

    def _try_trigger_event(self):
        """Try to trigger a random event based on game state."""
        state = self.active_game_state

        # Don't trigger if there's already a pending event
        if state.pending_event:
            return

        # Don't trigger during modal phases (review/retro)
        if state.current_sprint and state.current_sprint.phase in [SprintPhase.REVIEW, SprintPhase.RETRO]:
            return

        # Roll for event chance
        if random.random() > state.event_chance:
            return

        # Try to generate an event
        event = self.event_generator.generate_event(state)
        if event:
            state.pending_event = event
            state.chat_history.append({
                "sender": "EVENT",
                "text": f"🚨 {event.title}: {event.description}"
            })

    def _handle_quiz_answer(self, action):
        pass

    def _handle_task_move(self, action):
        state = self.active_game_state

        # WIP Limit Enforcement
        if action.get('new_column_id') == 'in_progress':
             current_wip = len(state.tasks['in_progress'])
             if current_wip >= state.wip_limit:
                 state.chat_history.append({"sender": "System", "text": "WIP Limit Exceeded! Finish existing tasks first."})
                 state.mentor_log.append({"sender": "Эрик", "text": "Стоп! Ты нарушаешь WIP-лимит. Закончи начатое, прежде чем начинать новое."})
                 return # Reject move

        task_to_move = None
        source_list = state.tasks.get(action.get('old_column_id'))
        if not source_list: return

        for i, task in enumerate(source_list):
            if task['id'] == action.get('task_id'):
                task_to_move = source_list.pop(i)
                break

        if task_to_move:
            destination_list = state.tasks.get(action.get('new_column_id'))
            destination_list.append(task_to_move)

            if action.get('new_column_id') == 'done':
                if task_to_move.get('assigned_resource'):
                    res_id = task_to_move['assigned_resource']
                    res = next((r for r in state.resources if r['id'] == res_id), None)
                    if res:
                        res['busy_task_id'] = None
                        task_to_move['assigned_resource'] = None
                        state.chat_history.append({"sender": "System", "text": f"{res['name']} освободился!"})

    def _handle_set_wip_limit(self, action):
        limit = action.get('limit')
        if isinstance(limit, int) and limit > 0: self.active_game_state.wip_limit = limit

    def _handle_minigame_result(self, action):
        pass

    def _handle_train_developer(self, action):
        """Начать обучение нового разработчика с помощью Брента."""
        state = self.active_game_state

        # Only available in Level 2+
        if state.level < 2:
            state.chat_history.append({"sender": "System", "text": "Обучение доступно только на Уровне 2 и выше."})
            return

        # Check if training is already in progress
        if state.training_in_progress:
            state.chat_history.append({"sender": "System", "text": f"Обучение уже идет! Осталось {state.training_in_progress['weeks_remaining']} нед."})
            return

        # Check if Brent is available
        brent = next((r for r in state.resources if r['id'] == 'brent'), None)
        if not brent:
            return

        if brent.get('busy_task_id'):
            state.chat_history.append({"sender": "System", "text": "Брент занят! Он не может обучать, пока работает над задачей."})
            state.mentor_log.append({"sender": "Эрик", "text": "Чтобы обучить кого-то, Брент должен быть свободен. Освободи его от текущих задач."})
            return

        # Start training (takes 3 weeks)
        trainee_id = f"trainee_{state.trainee_count + 1}"
        state.trainee_count += 1
        state.training_in_progress = {
            "trainee_id": trainee_id,
            "trainee_name": f"Стажер {state.trainee_count}",
            "weeks_remaining": 3
        }

        # Mark Brent as busy with training
        brent['busy_task_id'] = 'training'

        state.chat_history.append({"sender": "System", "text": f"Брент начал обучение стажера! Это займет 3 недели. Брент недоступен для задач."})
        state.mentor_log.append({"sender": "Эрик", "text": "Хорошее решение. Инвестиция в обучение. Короткосрочно Брент недоступен, но долгосрочно ты снизишь зависимость от одного узкого места."})

    def _handle_advance_week(self, action):
        """Продвинуть время на 1 неделю. Обновляет обучение, прогресс задач."""
        state = self.active_game_state
        state.week += 1

        # Update training progress
        if state.training_in_progress:
            state.training_in_progress['weeks_remaining'] -= 1

            if state.training_in_progress['weeks_remaining'] <= 0:
                # Training complete! Add new resource
                trainee_id = state.training_in_progress['trainee_id']
                trainee_name = state.training_in_progress['trainee_name']

                new_resource = {
                    "id": trainee_id,
                    "name": trainee_name,
                    "role": "Developer",
                    "avatar": "dev_avatar.png",
                    "busy_task_id": None,
                    "can_handle_brent_tasks": True  # Key: can now do tasks requiring Brent
                }

                state.resources.append(new_resource)

                # Free up Brent
                brent = next((r for r in state.resources if r['id'] == 'brent'), None)
                if brent:
                    brent['busy_task_id'] = None

                state.chat_history.append({"sender": "System", "text": f"Обучение завершено! {trainee_name} теперь готов к работе и может выполнять задачи, требующие экспертизы Брента!"})
                state.mentor_log.append({"sender": "Эрик", "text": f"Отлично! {trainee_name} готов. Теперь у вас есть еще один человек, который может справляться с критическими задачами. Так расширяется пропускная способность ограничения."})

                state.training_in_progress = None
            else:
                state.chat_history.append({"sender": "System", "text": f"Обучение продолжается. Осталось {state.training_in_progress['weeks_remaining']} нед."})

        # Update task progress (simplified - tasks in progress may move to review)
        # This is a basic implementation; real game would have more sophisticated progress
        state.chat_history.append({"sender": "System", "text": f"--- Неделя {state.week} ---"})

    # --- Sprint Action Handlers ---

    def _handle_sprint_create(self, action):
        """Создать новый спринт в фазе Planning."""
        state = self.active_game_state
        if state.current_sprint and state.current_sprint.phase != SprintPhase.COMPLETED:
            state.chat_history.append({"sender": "System", "text": "Активный спринт уже существует. Завершите его перед созданием нового."})
            return

        goal = action.get('goal', '')
        duration = action.get('duration_weeks', 2)

        new_sprint = Sprint(state.sprint_counter, goal, duration)
        state.current_sprint = new_sprint
        state.sprint_counter += 1

        state.chat_history.append({"sender": "System", "text": f"Sprint {new_sprint.id} создан. Установите цель и выберите задачи."})
        state.mentor_log.append({"sender": "Эрик", "text": "Planning фаза. Выберите задачи, которые команда может реально завершить. Не переоценивайте свою capacity."})

    def _handle_sprint_start(self, action):
        """Запустить спринт (Planning → Active)."""
        state = self.active_game_state
        if not state.current_sprint:
            return

        if state.current_sprint.phase != SprintPhase.PLANNING:
            state.chat_history.append({"sender": "System", "text": "Спринт можно запустить только из фазы Planning."})
            return

        if not state.current_sprint.task_ids:
            state.chat_history.append({"sender": "System", "text": "Добавьте хотя бы одну задачу в спринт!"})
            return

        state.current_sprint.phase = SprintPhase.ACTIVE
        state.current_sprint.start_time = datetime.now()
        state.current_sprint.current_week = 1

        # Enable Daily Standup
        state.daily_standup_available = True

        # Calculate planned velocity
        planned_points = 0
        for task_id in state.current_sprint.task_ids:
            for col in state.tasks.values():
                for t in col:
                    if t['id'] == task_id:
                        planned_points += t.get('points', 0)
                        break
        state.current_sprint.planned_velocity = planned_points

        state.chat_history.append({"sender": "System", "text": f"Sprint {state.current_sprint.id} запущен! Goal: {state.current_sprint.goal}"})
        state.mentor_log.append({"sender": "Эрик", "text": "Спринт начался. Фокусируйтесь на завершении задач, не начинайте новые."})

    def _handle_sprint_add_task(self, action):
        """Добавить задачу в backlog спринта."""
        state = self.active_game_state
        if not state.current_sprint or state.current_sprint.phase != SprintPhase.PLANNING:
            state.chat_history.append({"sender": "System", "text": "Задачи можно добавлять только в фазе Planning."})
            return

        task_id = action.get('task_id')
        if task_id not in state.current_sprint.task_ids:
            state.current_sprint.task_ids.append(task_id)

    def _handle_sprint_remove_task(self, action):
        """Удалить задачу из backlog спринта."""
        state = self.active_game_state
        if not state.current_sprint or state.current_sprint.phase != SprintPhase.PLANNING:
            return

        task_id = action.get('task_id')
        if task_id in state.current_sprint.task_ids:
            state.current_sprint.task_ids.remove(task_id)

    def _handle_sprint_end(self, action):
        """Завершить спринт (Active → Review → Retro)."""
        state = self.active_game_state
        if not state.current_sprint or state.current_sprint.phase != SprintPhase.ACTIVE:
            return

        # Calculate actual velocity (points in done)
        actual_points = 0
        for task_id in state.current_sprint.task_ids:
            for t in state.tasks['done']:
                if t['id'] == task_id:
                    actual_points += t.get('points', 0)
                    break

        state.current_sprint.actual_velocity = actual_points
        state.current_sprint.phase = SprintPhase.REVIEW
        state.current_sprint.end_time = datetime.now()

        state.chat_history.append({"sender": "System", "text": f"Sprint Review! Завершено: {actual_points}/{state.current_sprint.planned_velocity} pts."})
        state.mentor_log.append({"sender": "Эрик", "text": "Время для Sprint Review. Посмотрите, что было доставлено. Затем переходите к Retro."})

    def _handle_sprint_complete_retro(self, action):
        """Завершить ретроспективу и закрыть спринт."""
        state = self.active_game_state
        if not state.current_sprint or state.current_sprint.phase != SprintPhase.REVIEW:
            return

        retro_notes = action.get('notes', '')
        if retro_notes:
            state.current_sprint.retro_notes.append(retro_notes)

        # Move to history
        state.current_sprint.phase = SprintPhase.COMPLETED
        state.sprint_history.append(state.current_sprint)
        state.velocity_history.append({
            "sprint_id": state.current_sprint.id,
            "planned": state.current_sprint.planned_velocity,
            "actual": state.current_sprint.actual_velocity
        })

        completed_sprint_id = state.current_sprint.id
        state.current_sprint = None

        state.chat_history.append({"sender": "System", "text": f"Sprint {completed_sprint_id} завершен. Готовы к новому циклу!"})
        state.mentor_log.append({"sender": "Эрик", "text": "Ретроспектива завершена. Что вы улучшите в следующем спринте?"})

    def _handle_standup_trigger(self, action):
        """Обрабатывает Daily Standup."""
        state = self.active_game_state

        # Only allow standup during active sprint
        if not state.current_sprint or state.current_sprint.phase != SprintPhase.ACTIVE:
            state.chat_history.append({"sender": "System", "text": "Daily Standup доступен только во время активного спринта."})
            return

        # Increment standup counter
        state.standup_count += 1
        state.last_standup_week = state.current_sprint.current_week

        # Generate standup updates from team members based on their tasks
        in_progress_tasks = state.tasks.get('in_progress', [])

        # Brent's update
        brent_task = next((t for t in in_progress_tasks if t.get('assigned_resource') == 'brent'), None)
        if brent_task:
            state.chat_history.append({
                "sender": "Брент",
                "text": f"Вчера: работал над {brent_task['title']}. Сегодня: продолжу. Блокеров нет, но я единственный, кто может это сделать."
            })
        elif len(in_progress_tasks) > 0:
            state.chat_history.append({
                "sender": "Брент",
                "text": f"Свободен. Жду назначения. В работе {len(in_progress_tasks)} задач."
            })

        # Manager's update
        manager_blocked = len([t for t in in_progress_tasks if t.get('required_resource') and not t.get('assigned_resource')])
        if manager_blocked > 0:
            state.chat_history.append({
                "sender": "Steve (Manager)",
                "text": f"Вчера: пытался расставить ресурсы. Сегодня: {manager_blocked} задач заблокированы из-за нехватки Брента."
            })
        else:
            state.chat_history.append({
                "sender": "Steve (Manager)",
                "text": f"Команда работает. {len(in_progress_tasks)} задач в прогрессе. Всё по плану."
            })

        # Mentor insight based on standup
        if len(in_progress_tasks) > state.wip_limit:
            state.mentor_log.append({
                "sender": "Эрик",
                "text": "Обрати внимание на Standup. Слишком много работы в прогрессе означает долгий цикл обратной связи."
            })
        elif manager_blocked > 0:
            state.mentor_log.append({
                "sender": "Эрик",
                "text": "Standup выявил блокер. Брент — твое ограничение. Всё, что требует Брента, ждет его."
            })
        else:
            state.mentor_log.append({
                "sender": "Эрик",
                "text": "Хороший Standup. Команда синхронизирована. Продолжай фокусироваться на завершении."
            })

        state.daily_standup_available = False

engine = SimulationEngine()
