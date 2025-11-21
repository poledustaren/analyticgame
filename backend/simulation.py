import random
import json
import os
import glob

SAVES_DIR = os.path.join(os.path.dirname(__file__), 'saves')

class WorkType:
    BUSINESS = "business"
    INTERNAL = "internal"
    CHANGES = "changes"
    UNPLANNED = "unplanned"

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

    def to_dict(self): return self.__dict__
    @classmethod
    def from_dict(cls, data):
        instance = cls()
        instance.__dict__.update(data)
        return instance

class MockLLM:
    """Имитирует ответы ИИ-персонажей."""
    def __init__(self):
        self.responses = {
            "developer": ["Хм, задача выглядит сложнее.", "Понял, приступаю.", "Нужен четкий API-контракт."],
            "developer_wip_error": ["Наш WIP-лимит превышен! Не могу взять задачу."],
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
        # OpenRouterClient is not available in this environment
        # This class is kept for structure but will fall back gracefully
        self.client = None
        self.model = "z-ai/glm-4.5-air:free"

    def get_response(self, role, chat_history):
        return "AI service is currently unavailable."


class SimulationEngine:
    """Управляет игровыми сессиями с использованием LLM."""
    def __init__(self):
        self.active_game_state = None
        self.llm = MockLLM() # Force MockLLM for now to ensure stability

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

        self._check_level_transition()
        return self.active_game_state.to_dict()

    def _initialize_level_1(self):
        state = self.active_game_state
        state.level = 1
        state.unplanned_work = 80

        # Clear default tasks
        state.tasks["backlog"] = []
        state.tasks["in_progress"] = []

        # LEVEL 1 SCENARIO: Total Chaos (Unplanned Work)
        chaos_tasks = [
            {
                "id": "task-pay-1", "title": "CRITICAL: Payroll Failure",
                "type": WorkType.UNPLANNED, "points": 8, "duration": 4,
                "required_resource": "brent", "assigned_resource": None,
                "description": "Зарплаты не ушли. CFO угрожает увольнением."
            },
            {
                "id": "task-web-1", "title": "CRITICAL: Site Down 500 Error",
                "type": WorkType.UNPLANNED, "points": 5, "duration": 2,
                "required_resource": "brent", "assigned_resource": None,
                "description": "Главная страница не грузится. Маркетинг теряет лиды."
            },
            {
                "id": "task-sec-1", "title": "Audit: PII Leak Vulnerability",
                "type": WorkType.UNPLANNED, "points": 3, "duration": 2,
                "required_resource": "brent", "assigned_resource": None,
                "description": "CISO нашел дыру в безопасности данных клиентов."
            }
        ]

        # Business Project (Phoenix) - Stuck in Backlog
        phoenix_task = {
            "id": "task-phx-1", "title": "Project Phoenix: MVP Scope",
            "type": WorkType.BUSINESS, "points": 13, "duration": 10,
            "required_resource": None, "assigned_resource": None,
            "description": "Будущее компании. Но у нас нет времени на это."
        }

        state.tasks["in_progress"] = chaos_tasks # Start with fire!
        state.tasks["backlog"] = [phoenix_task]

        state.chat_history.append({"sender": "CFO", "text": "Где мои деньги?! Если зарплаты не уйдут к вечеру, у нас проблемы!"})
        state.chat_history.append({"sender": "Steve (Manager)", "text": "Билл, всё горит. Брент разрывается на части."})
        state.mentor_log.append({"sender": "Эрик", "text": "Посмотри на доску. Все красное. Это 'Незапланированная работа'. Она убивает твой проект."})

    def _initialize_level_2(self):
        state = self.active_game_state
        state.level = 2; state.wip_limit = 3
        state.chat_history.extend([{"sender": "System", "text": "--- НАЧАЛО УРОВНЯ 2: УВИДЕТЬ ПОТОК ---"}, {"sender": "Эрик", "text": self.llm.get_response("erik", state.chat_history)}])
        # Level 2 init logic here if needed

    def _initialize_level_3(self):
        state = self.active_game_state
        state.level = 3
        state.chat_history.extend([{"sender": "System", "text": "--- НАЧАЛО УРОВНЯ 3: ПЕТЛЯ ОБРАТНОЙ СВЯЗИ ---"}])

    def _check_level_transition(self):
        state = self.active_game_state

        # Win condition for Level 1: No Unplanned Work in Progress
        unplanned_in_progress = len([t for t in state.tasks['in_progress'] if t['type'] == WorkType.UNPLANNED])

        if state.level == 1 and unplanned_in_progress == 0 and state.unplanned_work > 40:
            # Visual progress
            state.unplanned_work = 40
            state.mentor_log.append({"sender": "Эрик", "text": "Пожары потушены. Но почему они возникли? Пришло время понять потоки."})
            # Transition logic to L2 can go here or be manual

    # --- Action Handlers ---

    def _handle_assign_resource(self, action):
        """Присваивает ресурс задаче. Если ресурс был занят, освобождает его от старой задачи."""
        state = self.active_game_state
        resource_id = action.get('resource_id')
        task_id = action.get('task_id')

        resource = next((r for r in state.resources if r['id'] == resource_id), None)
        if not resource: return

        # 1. Unassign from previous task if any
        if resource['busy_task_id']:
            # Find the old task and clear assignment
            for col in state.tasks.values():
                for t in col:
                    if t['id'] == resource['busy_task_id']:
                        t['assigned_resource'] = None

        # 2. Assign to new task
        resource['busy_task_id'] = task_id

        # Find the new task and update assignment
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
            # Erik comments on bottleneck
            if resource_id == 'brent':
                state.mentor_log.append({"sender": "Эрик", "text": "Ты используешь Брента как затычку. Он — твое ограничение. Пока он тут, другие задачи стоят."})

    def _handle_event_choice(self, action):
        # Placeholder for legacy event handling if needed
        pass

    def _handle_quiz_answer(self, action):
        pass

    def _handle_task_move(self, action):
        state = self.active_game_state

        # Check WIP limit logic
        if action.get('new_column_id') == 'in_progress':
             # Basic WIP check
             pass

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

            # If moving to Done, free up resource
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

engine = SimulationEngine()
