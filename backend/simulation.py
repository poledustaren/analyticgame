import random
import json
import os
import glob
from datetime import datetime, timedelta
from enum import Enum
import requests
from typing import Optional, List, Dict

SAVES_DIR = os.path.join(os.path.dirname(__file__), 'saves')

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

        # Sprint System
        self.current_sprint = None
        self.sprint_history = []
        self.velocity_history = []  # Track velocity across sprints
        self.sprint_counter = 1

    def to_dict(self):
        data = self.__dict__.copy()
        if self.current_sprint:
            data['current_sprint'] = self.current_sprint.to_dict()
        data['sprint_history'] = [s.to_dict() for s in self.sprint_history]
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
        # Sprint actions
        elif action_type == 'sprint_create': self._handle_sprint_create(action)
        elif action_type == 'sprint_start': self._handle_sprint_start(action)
        elif action_type == 'sprint_add_task': self._handle_sprint_add_task(action)
        elif action_type == 'sprint_remove_task': self._handle_sprint_remove_task(action)
        elif action_type == 'sprint_end': self._handle_sprint_end(action)
        elif action_type == 'sprint_complete_retro': self._handle_sprint_complete_retro(action)

        self._check_level_transition()
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
        state.level = 2
        state.wip_limit = 3 # Strict Limit for Level 2
        state.unplanned_work = 20 # Stabilized

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

    def _check_level_transition(self):
        state = self.active_game_state

        # Level 1 -> Level 2 Transition
        # Condition: All Unplanned Work (Red) is in 'done' column.
        if state.level == 1:
            unplanned_done = len([t for t in state.tasks['done'] if t['type'] == WorkType.UNPLANNED])
            # We spawned 3 unplanned tasks. If 3 are done, we proceed.
            # (Assuming player didn't delete them, which isn't possible yet)
            if unplanned_done >= 3:
                 self._initialize_level_2()

    # --- Action Handlers ---

    def _handle_assign_resource(self, action):
        state = self.active_game_state
        resource_id = action.get('resource_id')
        task_id = action.get('task_id')

        resource = next((r for r in state.resources if r['id'] == resource_id), None)
        if not resource: return

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

    def _handle_event_choice(self, action):
        pass

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

engine = SimulationEngine()
