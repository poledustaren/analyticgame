import random
import json
import os
import glob
from datetime import datetime, timedelta

SAVES_DIR = os.path.join(os.path.dirname(__file__), 'saves')

class SprintPhase:
    PLANNING = "planning"
    ACTIVE = "active"
    REVIEW = "review"
    RETRO = "retro"

class WorkType:
    BUSINESS = "business"
    INTERNAL = "internal"
    CHANGES = "changes"
    UNPLANNED = "unplanned"

class Sprint:
    """Управляет состоянием спринта с четырьмя фазами."""
    def __init__(self, sprint_number=1):
        self.sprint_number = sprint_number
        self.phase = SprintPhase.PLANNING
        self.capacity = 0  # Командная ёмкость (очки)
        self.sprint_goals = []  # Цели спринта
        self.sprint_backlog = []  # ID задач, выбранных для спринта
        self.completed_tasks = []  # ID завершённых задач
        self.velocity = 0  # Фактическая скорость (очки завершённых задач)
        self.retro_actions = []  # Действия из ретроспективы
        self.blocked_items = []  # Блокирующие факторы
        self.notes = {
            "planning": "",
            "review": "",
            "retro": ""
        }
        self.start_week = 1
        self.end_week = None

    def to_dict(self):
        return {
            "sprint_number": self.sprint_number,
            "phase": self.phase,
            "capacity": self.capacity,
            "sprint_goals": self.sprint_goals,
            "sprint_backlog": self.sprint_backlog,
            "completed_tasks": self.completed_tasks,
            "velocity": self.velocity,
            "retro_actions": self.retro_actions,
            "blocked_items": self.blocked_items,
            "notes": self.notes,
            "start_week": self.start_week,
            "end_week": self.end_week
        }

    @classmethod
    def from_dict(cls, data):
        instance = cls(data.get("sprint_number", 1))
        instance.phase = data.get("phase", SprintPhase.PLANNING)
        instance.capacity = data.get("capacity", 0)
        instance.sprint_goals = data.get("sprint_goals", [])
        instance.sprint_backlog = data.get("sprint_backlog", [])
        instance.completed_tasks = data.get("completed_tasks", [])
        instance.velocity = data.get("velocity", 0)
        instance.retro_actions = data.get("retro_actions", [])
        instance.blocked_items = data.get("blocked_items", [])
        instance.notes = data.get("notes", {"planning": "", "review": "", "retro": ""})
        instance.start_week = data.get("start_week", 1)
        instance.end_week = data.get("end_week")
        return instance

    def advance_phase(self):
        """Переход к следующей фазе спринта."""
        phase_order = [SprintPhase.PLANNING, SprintPhase.ACTIVE, SprintPhase.REVIEW, SprintPhase.RETRO]
        current_index = phase_order.index(self.phase)
        if current_index < len(phase_order) - 1:
            self.phase = phase_order[current_index + 1]
            return True
        return False

    def can_complete_task(self, task_id):
        """Проверяет, может ли задача быть завершена в этом спринте."""
        return task_id in self.sprint_backlog and task_id not in self.completed_tasks

    def add_completed_task(self, task_id, points):
        """Добавляет завершённую задачу и обновляет скорость."""
        if task_id not in self.completed_tasks:
            self.completed_tasks.append(task_id)
            self.velocity += points

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

        # Sprint System
        self.current_sprint = Sprint(1)
        self.sprint_history = []  # Завершённые спринты
        self.sprint_enabled = True  # Включена ли система спринтов

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

    def to_dict(self):
        """Сериализует состояние в словарь."""
        result = self.__dict__.copy()
        # Сериализуем текущий спринт
        if hasattr(self, 'current_sprint') and self.current_sprint:
            result['current_sprint'] = self.current_sprint.to_dict()
        # Сериализуем историю спринтов
        if hasattr(self, 'sprint_history'):
            result['sprint_history'] = [s.to_dict() for s in self.sprint_history]
        return result
    @classmethod
    def from_dict(cls, data):
        instance = cls()
        # Создаём копию данных для обработки спринтов
        data_copy = data.copy()
        # Десериализуем текущий спринт
        if 'current_sprint' in data_copy and data_copy['current_sprint']:
            instance.current_sprint = Sprint.from_dict(data_copy['current_sprint'])
            del data_copy['current_sprint']
        # Десериализуем историю спринтов
        if 'sprint_history' in data_copy:
            instance.sprint_history = [Sprint.from_dict(s) for s in data_copy['sprint_history']]
            del data_copy['sprint_history']
        # Обновляем остальные атрибуты
        instance.__dict__.update(data_copy)
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
        elif action_type == 'sprint_set_capacity': self._handle_sprint_set_capacity(action)
        elif action_type == 'sprint_add_goal': self._handle_sprint_add_goal(action)
        elif action_type == 'sprint_add_task': self._handle_sprint_add_task(action)
        elif action_type == 'sprint_remove_task': self._handle_sprint_remove_task(action)
        elif action_type == 'sprint_advance_phase': self._handle_sprint_advance_phase(action)
        elif action_type == 'sprint_add_note': self._handle_sprint_add_note(action)
        elif action_type == 'sprint_add_retro_action': self._handle_sprint_add_retro_action(action)
        elif action_type == 'sprint_complete': self._handle_sprint_complete(action)

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
                # Отслеживаем завершение задачи в спринте
                if state.current_sprint and state.current_sprint.phase == SprintPhase.ACTIVE:
                    if task_to_move['id'] in state.current_sprint.sprint_backlog:
                        state.current_sprint.add_completed_task(
                            task_to_move['id'],
                            task_to_move.get('points', 0)
                        )

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

    def _handle_sprint_set_capacity(self, action):
        """Устанавливает ёмкость спринта (доступные очки)."""
        state = self.active_game_state
        capacity = action.get('capacity')
        if isinstance(capacity, int) and capacity >= 0:
            state.current_sprint.capacity = capacity
            state.chat_history.append({"sender": "System", "text": f"Sprint capacity set to {capacity} points."})

    def _handle_sprint_add_goal(self, action):
        """Добавляет цель спринта."""
        state = self.active_game_state
        goal = action.get('goal')
        if goal and state.current_sprint.phase == SprintPhase.PLANNING:
            state.current_sprint.sprint_goals.append(goal)
            state.chat_history.append({"sender": "System", "text": f"Sprint goal added: {goal}"})

    def _handle_sprint_add_task(self, action):
        """Добавляет задачу в бэклог спринта."""
        state = self.active_game_state
        task_id = action.get('task_id')
        if not task_id: return

        # Находим задачу в общем бэклоге
        task = None
        for col in state.tasks.values():
            for t in col:
                if t['id'] == task_id:
                    task = t
                    break
            if task: break

        if task and state.current_sprint.phase == SprintPhase.PLANNING:
            if task_id not in state.current_sprint.sprint_backlog:
                state.current_sprint.sprint_backlog.append(task_id)
                state.chat_history.append({"sender": "System", "text": f"Added to sprint: {task['title']}"})

    def _handle_sprint_remove_task(self, action):
        """Удаляет задачу из бэклога спринта."""
        state = self.active_game_state
        task_id = action.get('task_id')
        if task_id in state.current_sprint.sprint_backlog:
            state.current_sprint.sprint_backlog.remove(task_id)
            state.chat_history.append({"sender": "System", "text": f"Removed from sprint backlog: {task_id}"})

    def _handle_sprint_advance_phase(self, action):
        """Переход к следующей фазе спринта."""
        state = self.active_game_state
        sprint = state.current_sprint
        old_phase = sprint.phase

        if sprint.advance_phase():
            new_phase = sprint.phase

            # Переход Planning → Active
            if old_phase == SprintPhase.PLANNING and new_phase == SprintPhase.ACTIVE:
                sprint.start_week = state.week
                state.chat_history.append({"sender": "System", "text": f"🚀 Sprint {sprint.sprint_number} started!"})
                state.mentor_log.append({"sender": "Эрик", "text": "Спринт начат. Работаем над задачами. Следим за потоком."})

            # Переход Active → Review
            elif old_phase == SprintPhase.ACTIVE and new_phase == SprintPhase.REVIEW:
                # Подсчитываем завершённые задачи
                completed_points = 0
                for task_id in sprint.sprint_backlog:
                    for task in state.tasks['done']:
                        if task['id'] == task_id and task_id not in [t for t in sprint.completed_tasks]:
                            sprint.add_completed_task(task_id, task.get('points', 0))
                            completed_points += task.get('points', 0)

                state.chat_history.append({"sender": "System", "text": f"📊 Sprint Review! Completed: {sprint.velocity}/{sprint.capacity} points."})
                state.mentor_log.append({"sender": "Эрик", "text": "Время обзора. Что мы сделали? Что получилось?"})

            # Переход Review → Retro
            elif old_phase == SprintPhase.REVIEW and new_phase == SprintPhase.RETRO:
                state.chat_history.append({"sender": "System", "text": "🔄 Sprint Retro! What went well? What to improve?"})
                state.mentor_log.append({"sender": "Эрик", "text": "Ретроспектива. Посмотрим на процесс. Что улучшить?"})

    def _handle_sprint_add_note(self, action):
        """Добавляет заметку к фазе спринта."""
        state = self.active_game_state
        phase = action.get('phase')  # planning, review, retro
        note = action.get('note')
        if phase and note:
            state.current_sprint.notes[phase] = note

    def _handle_sprint_add_retro_action(self, action):
        """Добавляет действие из ретроспективы."""
        state = self.active_game_state
        action_text = action.get('action')
        if action_text and state.current_sprint.phase == SprintPhase.RETRO:
            state.current_sprint.retro_actions.append(action_text)
            state.chat_history.append({"sender": "System", "text": f"Retro action added: {action_text}"})

    def _handle_sprint_complete(self, action):
        """Завершает спринт и начинает новый."""
        state = self.active_game_state
        old_sprint = state.current_sprint

        if old_sprint.phase != SprintPhase.RETRO:
            state.chat_history.append({"sender": "System", "text": "Complete Retro phase first!"})
            return

        # Сохраняем завершённый спринт в историю
        old_sprint.end_week = state.week
        state.sprint_history.append(old_sprint)

        # Создаём новый спринт
        new_sprint_number = old_sprint.sprint_number + 1
        state.current_sprint = Sprint(new_sprint_number)
        state.current_sprint.capacity = old_sprint.capacity  # Сохраняем ёмкость

        state.chat_history.append({"sender": "System", "text": f"✅ Sprint {old_sprint.sprint_number} completed! Velocity: {old_sprint.velocity}"})
        state.chat_history.append({"sender": "System", "text": f"🆕 Sprint {new_sprint_number} - Planning phase started!"})
        state.mentor_log.append({"sender": "Эрик", "text": f"Спринт {old_sprint.sprint_number} завершён. Скорость: {old_sprint.velocity}. Планируем следующий."})

engine = SimulationEngine()
