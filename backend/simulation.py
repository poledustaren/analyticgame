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
        state.chat_history.append({"sender": "System", "text": "НОВАЯ МЕХАНИКА: Брент может обучать других разработчиков. Это займет время, но снизит зависимость от одного узкого места."})
        state.mentor_log.append({"sender": "Эрик", "text": "Брент — твое узкое место. Ты можешь продолжать использовать его как затычку, ИЛИ он может обучить других. Выбор за тобой."})

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
