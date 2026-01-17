import random
import json
import os
import glob
from datetime import datetime, timedelta
from enum import Enum

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
    KNOWLEDGE_SHARING = "knowledge_sharing"

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
        self.knowledge = 0  # Knowledge sharing score (0-100)
        self.bus_factor = 1  # Number of people who know critical systems

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

        # Game Over State
        self.game_over = None  # {'reason': str, 'title': str, 'message': str} or None

        # Level Up State
        self.level_up = None  # {'from': int, 'to': int, 'message': str} or None

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
    def __init__(self, api_key):
        self.client = None
        self.model = "z-ai/glm-4.5-air:free"

    def get_response(self, role, chat_history):
        return "AI service is currently unavailable."


class SimulationEngine:
    """Управляет игровыми сессиями с использованием LLM."""
    def __init__(self):
        self.active_game_state = None
        self.llm = MockLLM()

        if not os.path.exists(SAVES_DIR):
            os.makedirs(SAVES_DIR)

    def new_game(self):
        self.active_game_state = GameState()
        self._initialize_level_1()
        return self.active_game_state.to_dict()

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
        # Knowledge Sharing actions
        elif action_type == 'knowledge_share': self._handle_knowledge_share(action)
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

    def _initialize_level_3(self):
        state = self.active_game_state
        old_level = state.level
        state.level = 3
        state.wip_limit = 4

        # Set level_up notification for frontend
        state.level_up = {
            'from': old_level,
            'to': 3,
            'message': 'LEVEL UP! Петли обратной связи.',
            'stats': {
                'title': 'The Feedback Loop',
                'objective': 'Внедрить CAB и повысить качество кода.'
            }
        }

        new_tasks = [
            {"id": "task-cicd-1", "title": "Setup CI Pipeline", "type": WorkType.INTERNAL, "points": 8, "duration": 4, "required_resource": "brent", "assigned_resource": None, "description": "Автоматизируем сборку и тесты."},
            {"id": "task-cab-1", "title": "CAB Meeting: Code Review Process", "type": WorkType.CHANGES, "points": 3, "duration": 2, "required_resource": None, "assigned_resource": None, "description": "Утвердить процесс ревью кода."},
            {"id": "task-feat-3", "title": "User Authentication API", "type": WorkType.BUSINESS, "points": 8, "duration": 5, "required_resource": None, "assigned_resource": None, "description": "API для аутентификации пользователей."}
        ]

        state.tasks["backlog"].extend(new_tasks)

        state.chat_history.append({"sender": "System", "text": "--- УРОВЕНЬ 3: ПЕТЛИ ОБРАТНОЙ СВЯЗИ ---"})
        state.mentor_log.append({"sender": "Эрик", "text": "Второй путь: создавай петли обратной связи справа налево. Чем раньше найдешь ошибку, тем дешевле её исправить."})

    def _initialize_level_4(self):
        state = self.active_game_state
        old_level = state.level
        state.level = 4
        state.wip_limit = 5

        # Set level_up notification for frontend
        state.level_up = {
            'from': old_level,
            'to': 4,
            'message': 'LEVEL UP! Культура улучшений и Knowledge Sharing.',
            'stats': {
                'title': 'The Culture of Learning',
                'objective': 'Нарасти Knowledge Score для снижения Bus Factor риска.'
            }
        }

        # Knowledge Sharing tasks for Level 4
        knowledge_tasks = [
            {"id": "task-kn-1", "title": "Documentation: Payroll System", "type": WorkType.KNOWLEDGE_SHARING, "points": 3, "duration": 2, "required_resource": "brent", "assigned_resource": None, "knowledge_gain": 10, "description": "Брент документирует систему зарплаты."},
            {"id": "task-kn-2", "title": "Mentoring: Database Operations", "type": WorkType.KNOWLEDGE_SHARING, "points": 5, "duration": 3, "required_resource": "brent", "assigned_resource": None, "knowledge_gain": 15, "description": "Брент менторит команду по работе с БД."},
            {"id": "task-kn-3", "title": "Pair Programming: API Architecture", "type": WorkType.KNOWLEDGE_SHARING, "points": 5, "duration": 3, "required_resource": "brent", "assigned_resource": None, "knowledge_gain": 20, "description": "Совместная разработка с командой."},
            {"id": "task-kn-4", "title": "Documentation: Deployment Process", "type": WorkType.KNOWLEDGE_SHARING, "points": 3, "duration": 2, "required_resource": "brent", "assigned_resource": None, "knowledge_gain": 10, "description": "Документация процесса деплоя."},
            {"id": "task-kn-5", "title": "Knowledge Base Setup", "type": WorkType.KNOWLEDGE_SHARING, "points": 5, "duration": 3, "required_resource": None, "assigned_resource": None, "knowledge_gain": 15, "description": "Создание базы знаний команды."}
        ]

        # Business tasks for Level 4
        business_tasks = [
            {"id": "task-feat-4", "title": "Real-time Analytics Dashboard", "type": WorkType.BUSINESS, "points": 13, "duration": 6, "required_resource": None, "assigned_resource": None, "description": "Дашборд аналитики в реальном времени."},
            {"id": "task-auto-1", "title": "CD Pipeline: Auto Deployment", "type": WorkType.INTERNAL, "points": 8, "duration": 4, "required_resource": "brent", "assigned_resource": None, "description": "Автоматический деплой на прод."}
        ]

        state.tasks["backlog"].extend(knowledge_tasks)
        state.tasks["backlog"].extend(business_tasks)

        state.chat_history.append({"sender": "System", "text": "--- УРОВЕНЬ 4: КУЛЬТУРА УЛУЧШЕНИЙ ---"})
        state.mentor_log.append({"sender": "Эрик", "text": "Третий путь: культура постоянного экспериментирования и обучения. Твой Bus Factor сейчас равен 1 - если Брент заболеет, всё остановится. Выполняй задачи Knowledge Sharing, чтобы распределить знания!"})
        state.chat_history.append({"sender": "System", "text": "Новая механика: Knowledge Sharing! Выполняющие эти задачи увеличат Knowledge Score и повысят Bus Factor."})

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

        # Level 2 -> Level 3 Transition
        # Condition: Complete at least 2 business tasks and maintain stability
        elif state.level == 2:
            business_done = len([t for t in state.tasks['done'] if t['type'] == WorkType.BUSINESS])
            if business_done >= 2:
                self._initialize_level_3()

        # Level 3 -> Level 4 Transition
        # Condition: Complete at least 1 internal task and 1 business task in level 3
        elif state.level == 3:
            # Count tasks done in level 3 (simplified check)
            total_done = len(state.tasks['done'])
            if total_done >= 5:  # After completing 5 tasks total
                self._initialize_level_4()

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

                # Knowledge Sharing mechanic: completing knowledge_sharing tasks increases knowledge
                if task_to_move.get('type') == WorkType.KNOWLEDGE_SHARING:
                    knowledge_gain = task_to_move.get('knowledge_gain', 5)
                    state.knowledge = min(100, state.knowledge + knowledge_gain)

                    # Update bus_factor based on knowledge milestones
                    old_bus_factor = state.bus_factor
                    if state.knowledge >= 25 and state.bus_factor < 2:
                        state.bus_factor = 2
                    elif state.knowledge >= 50 and state.bus_factor < 3:
                        state.bus_factor = 3
                    elif state.knowledge >= 75 and state.bus_factor < 4:
                        state.bus_factor = 4
                    elif state.knowledge >= 100 and state.bus_factor < 5:
                        state.bus_factor = 5

                    if old_bus_factor != state.bus_factor:
                        state.mentor_log.append({"sender": "Эрик", "text": f"Bus Factor увеличился до {state.bus_factor}! Команда становится более устойчивой."})
                        self._ensure_developers_for_bus_factor()

                    state.chat_history.append({"sender": "System", "text": f"Knowledge Sharing завершен! Knowledge +{knowledge_gain} (текущий: {state.knowledge}%)"})

    def _handle_set_wip_limit(self, action):
        limit = action.get('limit')
        if isinstance(limit, int) and limit > 0: self.active_game_state.wip_limit = limit

    def _handle_minigame_result(self, action):
        pass

    def _handle_knowledge_share(self, action):
        """Обрабатывает действия Knowledge Sharing."""
        state = self.active_game_state
        share_type = action.get('share_type', 'documentation')  # documentation, mentoring, pair_programming
        amount = action.get('amount', 10)

        # Knowledge increases based on type
        knowledge_gain = amount
        if share_type == 'documentation':
            knowledge_gain = 5
            state.chat_history.append({"sender": "System", "text": "Брент создал документацию. Knowledge +5"})
        elif share_type == 'mentoring':
            knowledge_gain = 10
            state.chat_history.append({"sender": "System", "text": "Брент провел менторскую сессию. Knowledge +10"})
        elif share_type == 'pair_programming':
            knowledge_gain = 15
            state.chat_history.append({"sender": "System", "text": "Pair programming сессия завершена. Knowledge +15"})

        state.knowledge = min(100, state.knowledge + knowledge_gain)

        # Update bus_factor based on knowledge
        if state.knowledge >= 25 and state.bus_factor < 2:
            state.bus_factor = 2
            state.mentor_log.append({"sender": "Эрик", "text": "Отлично! Теперь двое человек знают критические системы. Bus Factor: 2"})
        elif state.knowledge >= 50 and state.bus_factor < 3:
            state.bus_factor = 3
            state.mentor_log.append({"sender": "Эрик", "text": "Прогресс! Трое человек могут покрыть друг друга. Bus Factor: 3"})
        elif state.knowledge >= 75 and state.bus_factor < 4:
            state.bus_factor = 4
            state.mentor_log.append({"sender": "Эрик", "text": "Здорово! Команда становится устойчивой. Bus Factor: 4"})
        elif state.knowledge >= 100 and state.bus_factor < 5:
            state.bus_factor = 5
            state.mentor_log.append({"sender": "Эрик", "text": "Превосходно! Знания распределены по команде. Bus Factor: 5"})

        # Add new developer resource when bus_factor increases
        self._ensure_developers_for_bus_factor()

    def _ensure_developers_for_bus_factor(self):
        """Добавляет разработчиков в resources в соответствии с bus_factor."""
        state = self.active_game_state
        target_devs = state.bus_factor  # Brent + (bus_factor - 1) other developers

        current_dev_count = len(state.resources)

        while len(state.resources) < target_devs:
            new_dev_id = f"dev{len(state.resources)}"
            new_dev = {
                "id": new_dev_id,
                "name": f"Разработчик {len(state.resources)}",
                "role": "Software Engineer",
                "avatar": f"{new_dev_id}_avatar.png",
                "busy_task_id": None
            }
            state.resources.append(new_dev)
            state.chat_history.append({"sender": "System", "text": f"{new_dev['name']} присоединился к команде и готов к работе!"})

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
