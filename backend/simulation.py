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


class PlanningPokerSession:
    """Сессия Planning Poker для оценки задач."""
    FIBONACCI_CARDS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

    def __init__(self, task_id: str, task_title: str):
        self.task_id = task_id
        self.task_title = task_title
        self.player_vote = None
        self.ai_votes = {}  # {"dev1": 5, "dev2": 8, ...}
        self.consensus_reached = False
        self.final_estimate = None
        self.round = 1

    def record_player_vote(self, vote: int):
        self.player_vote = vote
        self._generate_ai_votes()
        self._check_consensus()
        return self.to_dict()

    def _generate_ai_votes(self):
        """Генерирует голоса AI-членов команды."""
        import random
        # Simulated team members with different estimation styles
        ai_members = [
            {"id": "alice", "name": "Алиса (Senior Dev)", "style": "optimistic"},
            {"id": "bob", "name": "Боб (QA)", "style": "careful"},
            {"id": "carol", "name": "Кэрол (Tech Lead)", "style": "moderate"}
        ]

        # Base estimate influenced by player's vote if set
        base = self.player_vote if self.player_vote else 5

        for member in ai_members:
            if member["style"] == "optimistic":
                vote = max(1, min(21, random.choice([1, 2, 3, 5, 8])))
            elif member["style"] == "careful":
                vote = max(3, min(34, random.choice([3, 5, 8, 13, 21])))
            else:  # moderate
                vote = max(2, min(13, random.choice([2, 3, 5, 8, 13])))
            self.ai_votes[member["id"]] = {
                "name": member["name"],
                "vote": vote
            }

    def _check_consensus(self):
        """Проверяет, достигнут ли консенсус."""
        all_votes = [self.player_vote] + [v["vote"] for v in self.ai_votes.values()]
        # Consensus: all votes are same or adjacent in Fibonacci sequence
        if len(set(all_votes)) == 1:
            self.consensus_reached = True
            self.final_estimate = self.player_vote
        elif max(all_votes) - min(all_votes) <= 2:
            # Close enough - use average rounded to nearest Fibonacci
            avg = sum(all_votes) / len(all_votes)
            self.final_estimate = self._nearest_fibonacci(avg)
            self.consensus_reached = True

    def _nearest_fibonacci(self, n):
        """Находит ближайшее число Фибоначчи."""
        for card in self.FIBONACCI_CARDS:
            if abs(n - card) <= 1:
                return card
        return 5  # Default

    def to_dict(self):
        return {
            "task_id": self.task_id,
            "task_title": self.task_title,
            "player_vote": self.player_vote,
            "ai_votes": self.ai_votes,
            "consensus_reached": self.consensus_reached,
            "final_estimate": self.final_estimate,
            "round": self.round,
            "cards": self.FIBONACCI_CARDS
        }

class QuizSession:
    """Сессия викторины для проверки знаний DevOps."""
    QUESTIONS = [
        {
            "id": "q1",
            "question": "Что такое ' bottleneck' (узкое место) в теории ограничений?",
            "options": [
                "Точка, где работа накапливается и замедляет весь поток",
                "Самая быстрая часть процесса",
                "Место для хранения ресурсов",
                "Тип диаграммы Ганта"
            ],
            "correct": 0,
            "explanation": "Узкое место — это этап процесса, который ограничивает общую пропускную способность. В Phoenix Project это Брент."
        },
        {
            "id": "q2",
            "question": "Какой из четырех типов работы представляет собой пожары и инциденты?",
            "options": [
                "Business Projects",
                "Internal Projects",
                "Changes",
                "Unplanned Work"
            ],
            "correct": 3,
            "explanation": "Незапланированная работа (Unplanned Work) — это пожары, инциденты и неожиданные проблемы."
        },
        {
            "id": "q3",
            "question": "Что означает WIP-лимит?",
            "options": [
                "Максимальное количество задач в работе одновременно",
                "Время завершения спринта",
                "Бюджет на квартал",
                "Количество разработчиков в команде"
            ],
            "correct": 0,
            "explanation": "WIP (Work In Progress) лимит ограничивает количество задач в работе, чтобы улучшить поток и уменьшить время выполнения."
        },
        {
            "id": "q4",
            "question": "Какой из принципов НЕ относится к Трем путям DevOps?",
            "options": [
                "Flow (Поток)",
                "Feedback (Обратная связь)",
                "Continual Learning and Experimentation (Непрерывное обучение)",
                "Command and Control (Командование и контроль)"
            ],
            "correct": 3,
            "explanation": "Command and Control — это традиционный подход, который DevOps заменяет на культуру доверия и сотрудничества."
        },
        {
            "id": "q5",
            "question": "Что такое Story Points в Planning Poker?",
            "options": [
                "Время в часах для выполнения задачи",
                "Относительная оценка сложности задачи",
                "Количество разработчиков",
                "Приоритет задачи"
            ],
            "correct": 1,
            "explanation": "Story Points — это относительная мера сложности, а не прямая оценка времени. Она учитывает риск, неопределенность и усилия."
        },
        {
            "id": "q6",
            "question": "Что показывает Cycle Time?",
            "options": [
                "Время от начала до конца работы над элементом",
                "Время, прошедшее с момента запроса функции",
                "Длительность встречи",
                "Время обеденного перерыва"
            ],
            "correct": 0,
            "explanation": "Cycle Time — это время, которое проходит с момента начала работы над задачей до её завершения. Ключевой метрики потока."
        },
        {
            "id": "q7",
            "question": "Что делать, если WIP-лимит превышен?",
            "options": [
                "Нанять больше людей",
                "Перестать брать новые задачи, пока текущие не завершатся",
                "Увеличить лимит без обсуждения",
                "Игнорировать лимит"
            ],
            "correct": 1,
            "explanation": "Когда WIP-лимит достигнут, нужно остановить старт новых задач и сфокусироваться на завершении текущих. Это суть Flow."
        },
        {
            "id": "q8",
            "question": "Кто такой Брент в Phoenix Project?",
            "options": [
                "CEO компании",
                "Узкое место — единственный специалист, знающий критические системы",
                "Клиент",
                "Конкурент"
            ],
            "correct": 1,
            "explanation": "Брент — это архетип узкого места: единственный человек, который знает, как работают критические системы. Все зависит от него."
        }
    ]

    def __init__(self):
        self.current_question = None
        self.score = 0
        self.total_answered = 0
        self.answered_questions = []

    def get_random_question(self):
        """Возвращает случайный вопрос, который еще не был задан."""
        available = [q for q in self.QUESTIONS if q['id'] not in self.answered_questions]
        if not available:
            return None
        return random.choice(available)

    def start_question(self):
        """Начинает новый вопрос."""
        self.current_question = self.get_random_question()
        return self.to_dict()

    def answer(self, answer_index):
        """Проверяет ответ и возвращает результат."""
        if not self.current_question:
            return {"error": "No active question"}

        self.total_answered += 1
        self.answered_questions.append(self.current_question['id'])

        is_correct = answer_index == self.current_question['correct']
        if is_correct:
            self.score += 1

        result = {
            "question": self.current_question,
            "answer_index": answer_index,
            "is_correct": is_correct,
            "correct_answer": self.current_question['correct'],
            "explanation": self.current_question['explanation'],
            "score": self.score,
            "total": self.total_answered
        }

        self.current_question = None
        return result

    def to_dict(self):
        return {
            "current_question": self.current_question,
            "score": self.score,
            "total_answered": self.total_answered,
            "remaining": len(self.QUESTIONS) - len(self.answered_questions)
        }

class SimulationEngine:
    """Управляет игровыми сессиями с использованием LLM."""
    def __init__(self):
        self.active_game_state = None
        self.llm = MockLLM()
        self.planning_poker_session = None
        self.quiz_session = QuizSession()

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
        state = self.active_game_state.to_dict()
        # Include planning poker session if active
        if self.planning_poker_session:
            state['planning_poker'] = self.planning_poker_session.to_dict()
        else:
            state['planning_poker'] = None
        # Include quiz session
        state['quiz'] = self.quiz_session.to_dict()
        return state

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
        # Planning Poker actions
        elif action_type == 'poker_start': self._handle_poker_start(action)
        elif action_type == 'poker_vote': self._handle_poker_vote(action)
        elif action_type == 'poker_apply': self._handle_poker_apply(action)
        elif action_type == 'poker_cancel': self._handle_poker_cancel(action)
        # Quiz actions
        elif action_type == 'quiz_start': self._handle_quiz_start(action)
        elif action_type == 'quiz_submit_answer': self._handle_quiz_submit_answer(action)

        self._check_level_transition()
        return self.get_current_state()

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

    # --- Planning Poker Handlers ---

    def _handle_poker_start(self, action):
        """Начать сессию Planning Poker для задачи."""
        state = self.active_game_state
        task_id = action.get('task_id')

        # Find the task
        task = None
        for col in state.tasks.values():
            for t in col:
                if t['id'] == task_id:
                    task = t
                    break
            if task: break

        if not task:
            state.chat_history.append({"sender": "System", "text": "Задача не найдена."})
            return

        self.planning_poker_session = PlanningPokerSession(task_id, task['title'])
        state.chat_history.append({"sender": "System", "text": f"🎴 Planning Poker начат для: {task['title']}"})
        state.mentor_log.append({"sender": "Эрик", "text": "Planning Poker помогает команде достичь консенсуса в оценке. Выберите карту, когда будете готовы."})

    def _handle_poker_vote(self, action):
        """Игрок делает свой ход в Planning Poker."""
        state = self.active_game_state
        if not self.planning_poker_session:
            return

        vote = action.get('vote')
        if vote not in PlanningPokerSession.FIBONACCI_CARDS:
            return

        result = self.planning_poker_session.record_player_vote(vote)

        if result['consensus_reached']:
            state.chat_history.append({"sender": "System", "text": f"🎯 Консенсус! Оценка: {result['final_estimate']} pts"})
            state.mentor_log.append({"sender": "Эрик", "text": f"Отлично! Команда договорилась на {result['final_estimate']} story points."})
        else:
            votes_str = ", ".join([f"{v['name']}: {v['vote']}" for v in result['ai_votes'].values()])
            state.chat_history.append({"sender": "System", "text": f"🃏 Голоса: Вы: {vote} | {votes_str}"})
            state.mentor_log.append({"sender": "Эрик", "text": "Оценки разнятся. Обсудите задачу и проголосуйте снова или примите усредненную оценку."})

    def _handle_poker_apply(self, action):
        """Применить финальную оценку к задаче."""
        state = self.active_game_state
        if not self.planning_poker_session or not self.planning_poker_session.consensus_reached:
            return

        final_estimate = self.planning_poker_session.final_estimate
        task_id = self.planning_poker_session.task_id

        # Update task points
        for col in state.tasks.values():
            for t in col:
                if t['id'] == task_id:
                    t['points'] = final_estimate
                    state.chat_history.append({"sender": "System", "text": f"✅ Задаче '{t['title']}' присвоено {final_estimate} pts"})
                    break

        self.planning_poker_session = None

    def _handle_poker_cancel(self, action):
        """Отменить сессию Planning Poker."""
        self.planning_poker_session = None
        self.active_game_state.chat_history.append({"sender": "System", "text": "Planning Poker отменен."})

    # --- Quiz Handlers ---

    def _handle_quiz_start(self, action):
        """Начать новый вопрос викторины."""
        state = self.active_game_state
        result = self.quiz_session.start_question()

        if result['current_question']:
            state.chat_history.append({"sender": "System", "text": "🧠 Викторина: Проверь свои знания DevOps!"})
            state.mentor_log.append({"sender": "Эрик", "text": "Хороший способ закрепить знания — ответить на вопрос. Давай проверим, что ты усвоил."})
        else:
            state.chat_history.append({"sender": "System", "text": f"🎉 Викторина завершена! Твой счет: {self.quiz_session.score}/{len(QuizSession.QUESTIONS)}"})
            state.mentor_log.append({"sender": "Эрик", "text": f"Отличная работа! Ты ответил правильно на {self.quiz_session.score} из {len(QuizSession.QUESTIONS)} вопросов."})

    def _handle_quiz_submit_answer(self, action):
        """Отправить ответ на вопрос викторины."""
        state = self.active_game_state
        answer_index = action.get('answer_index')

        result = self.quiz_session.answer(answer_index)

        if 'error' not in result:
            if result['is_correct']:
                state.chat_history.append({"sender": "System", "text": f"✅ Правильно! {result['explanation']}"})
                state.mentor_log.append({"sender": "Эрик", "text": "Отлично! Ты понимаешь суть."})
            else:
                state.chat_history.append({"sender": "System", "text": f"❌ Неправильно. {result['explanation']}"})
                state.mentor_log.append({"sender": "Эрик", "text": "Не страшно ошибаться — главное, учиться на ошибках."})

engine = SimulationEngine()
