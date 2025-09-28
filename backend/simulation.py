import random

class GameState:
    """Хранит все данные о текущем состоянии игры."""
    def __init__(self):
        self.week = 1
        self.revenue = 1000000
        self.stability = 80
        self.morale = 70
        self.budget = 500000
        self.unplanned_work = 80  # Новая метрика в %
        self.phoenix_progress = 0 # Новая метрика в %
        self.chat_history = [{"sender": "System", "text": "Добро пожаловать в симулятор 'Проект Феникс'!"}]
        self.tasks = {
            "backlog": [
                {"id": "task-1", "title": "Анализ требований по платежам", "points": 2, "duration": 2, "start_week": None},
                {"id": "task-2", "title": "Проектирование архитектуры", "points": 3, "duration": 3, "start_week": None},
                {"id": "task-3", "title": "Настройка тестового окружения", "points": 1, "duration": 1, "start_week": None},
            ],
            "in_progress": [],
            "review": [],
            "done": []
        }
        self.active_events = [] # Замена одиночного scenario

    def to_dict(self):
        """Преобразует состояние игры в словарь для отправки на фронтенд."""
        return {
            "week": self.week,
            "revenue": self.revenue,
            "stability": self.stability,
            "morale": self.morale,
            "budget": self.budget,
            "unplanned_work": self.unplanned_work,
            "phoenix_progress": self.phoenix_progress,
            "chat_history": self.chat_history,
            "tasks": self.tasks,
            "active_events": self.active_events
        }

class MockLLM:
    """Имитирует ответы ИИ-персонажей. (без изменений)"""
    def __init__(self):
        self.responses = {
            "developer": ["Хм, задача выглядит сложнее, чем кажется.", "Понял, приступаю к работе.", "Для этого мне нужен четкий API-контракт."],
            "manager": ["Команда, нам нужно ускорить темп.", "Отлично, это важный шаг.", "Бюджет не резиновый."],
            "stakeholder": ["Я хочу видеть прогресс.", "Нам нужна эта фича как можно скорее.", "А можем мы добавить еще и аналитический модуль?"],
            "ciso": ["Безопасность прежде всего. У нас критические уязвимости, которые нужно закрыть вчера!"],
            "cfo": ["Меня не волнует как, просто почините зарплатную ведомость! Люди должны получить деньги!"],
            "marketing": ["Наш главный сайт лежит! Рекламная кампания горит, мы теряем деньги каждую минуту!"],
            "erik": [
                "Интересная ситуация... А сколько разных типов работы вы делаете прямо сейчас?",
                "Выглядит так, будто вы постоянно тушите пожары. Это и есть ваша основная работа?",
                "Если вы не управляете незапланированной работой, она управляет вами."
            ]
        }
    def get_response(self, role, context_message=""):
        if role in self.responses:
            return random.choice(self.responses[role])
        return "Я не знаю, что ответить на это."

class SimulationEngine:
    """Управляет основной логикой и состоянием игры."""
    def __init__(self):
        self.state = GameState()
        self.llm = MockLLM()
        self.initialize_game()

    def initialize_game(self):
        """Задает начальные события для Уровня 1."""
        self.state.chat_history.append({"sender": "CFO", "text": self.llm.get_response("cfo")})
        self.state.chat_history.append({"sender": "Маркетинг", "text": self.llm.get_response("marketing")})
        self.state.chat_history.append({"sender": "CISO", "text": self.llm.get_response("ciso")})

        self.state.active_events = [
            {
                "id": "payroll_outage", "type": "crisis",
                "title": "Сбой в системе расчета зарплаты!",
                "text": "Финансовый директор в ярости. Сотрудники не могут получить чеки.",
                "choices": [
                    {"id": "use_brent", "text": "Отправить Брента все исправить"},
                    {"id": "form_team", "text": "Собрать команду для анализа"}
                ]
            },
            {
                "id": "website_down", "type": "crisis",
                "title": "Упал основной сайт!",
                "text": "Отдел маркетинга сообщает о потерях из-за неработающей рекламной кампании.",
                "choices": [
                    {"id": "brent_again", "text": "Снова отправить Брента"},
                    {"id": "restart_server", "text": "Перезагрузить все серверы наудачу"}
                ]
            },
            {
                "id": "security_audit", "type": "crisis",
                "title": "Критическая уязвимость перед аудитом!",
                "text": "Директор по безопасности требует немедленно исправить брешь в системе.",
                "choices": [
                    {"id": "brent_the_savior", "text": "И опять Брент нас спасет"},
                    {"id": "accept_risk", "text": "Принять риск и отложить исправление"}
                ]
            }
        ]

    def _check_for_next_stage(self):
        """Проверяет, достигнуты ли цели уровня, и запускает следующее событие."""
        if not self.state.active_events and self.state.unplanned_work < 40:
            self.state.chat_history.append({"sender": "Эрик", "text": self.llm.get_response("erik")})
            self.state.active_events.append({
                "id": "erik_quiz_1", "type": "quiz",
                "title": "Урок от Эрика: Четыре типа работы",
                "text": "Эрик говорит: 'Похоже, вы разобрались с хаосом. Но чтобы он не вернулся, нужно понимать его природу. Какой из этих типов работы самый коварный и разрушительный для продуктивности?'",
                "choices": [
                    {"id": "biz_projects", "text": "Бизнес-проекты"},
                    {"id": "internal_projects", "text": "Внутренние IT-проекты"},
                    {"id": "unplanned_work", "text": "Незапланированная работа"},
                    {"id": "changes", "text": "Изменения"}
                ]
            })

    def process_action(self, action_data):
        """Обрабатывает любое действие от игрока."""
        action_type = action_data.get('type')

        if action_type == 'event_choice':
            event_id = action_data.get('event_id')
            choice_id = action_data.get('choice_id')

            event = next((e for e in self.state.active_events if e['id'] == event_id), None)
            if not event:
                return self.state.to_dict()

            # Простое применение последствий
            self.state.morale -= 5 # Любой кризис деморализует
            self.state.budget -= 5000 # Любое действие требует ресурсов
            self.state.unplanned_work -= 25 # Решили один из пожаров
            if 'brent' in choice_id:
                self.state.phoenix_progress -= 5 # Брент отвлечен от "Феникса"
                self.state.chat_history.append({"sender": "System", "text": f"Брент героически решил проблему '{event['title']}', но проект 'Феникс' снова отложен."})
            else:
                self.state.stability -= 10 # Решение без Брента менее надежно
                self.state.chat_history.append({"sender": "System", "text": f"Проблема '{event['title']}' решена, но это вызвало новые риски стабильности."})

            # Убираем решенное событие
            self.state.active_events = [e for e in self.state.active_events if e['id'] != event_id]

            # Проверяем, не пора ли переходить на следующий этап
            self._check_for_next_stage()

        elif action_type == 'quiz_answer':
            choice_id = action_data.get('choice_id')
            if choice_id == 'unplanned_work':
                self.state.chat_history.append({"sender": "Эрик", "text": "Верно! Именно она. Теперь, когда вы это знаете, вы можете начать ей управлять. Отличная работа."})
                self.state.phoenix_progress += 20 # Понимание проблемы - ключ к успеху
            else:
                self.state.chat_history.append({"sender": "Эрик", "text": "Не совсем. Подумайте еще раз. Что мешает вам больше всего заниматься плановой работой?"})
                self.state.morale -= 10
            # Убираем квиз после ответа
            self.state.active_events = [e for e in self.state.active_events if e['type'] != 'quiz']

        # Другие типы действий (task_move и т.д.) пока оставим без изменений
        elif action_data.get('type') == 'task_move':
            self.process_task_move(action_data.get('task_id'), action_data.get('new_column_id'), action_data.get('old_column_id'))

        return self.state.to_dict()

    def process_task_move(self, task_id, new_column_id, old_column_id):
        """Перемещает задачу между колонками и обновляет метрики."""
        task_to_move = None
        source_list = self.state.tasks.get(old_column_id)
        if not source_list: return self.state.to_dict()
        for i, task in enumerate(source_list):
            if task['id'] == task_id:
                task_to_move = source_list.pop(i)
                break
        if task_to_move:
            destination_list = self.state.tasks.get(new_column_id)
            if destination_list is not None:
                destination_list.append(task_to_move)
                self.state.chat_history.append({"sender": "System", "text": f"Задача '{task_to_move['title']}' перемещена в '{new_column_id}'."})
                if new_column_id == 'in_progress' and old_column_id == 'backlog':
                    task_to_move['start_week'] = self.state.week
                    cost = task_to_move.get('points', 1) * 1500
                    self.state.budget -= cost
                    self.state.chat_history.append({"sender": "System", "text": f"Начата работа над задачей. Бюджет уменьшен на ${cost}."})
                    self.state.phoenix_progress += 10
                elif new_column_id == 'done':
                    self.state.stability += task_to_move.get('points', 1)
                    self.state.morale += 2
                    self.state.phoenix_progress += 5
                    self.state.chat_history.append({"sender": "System", "text": "Задача завершена! Стабильность и мораль выросли."})
            else:
                source_list.append(task_to_move)
        return self.state.to_dict()

    def get_current_state(self):
        """Возвращает текущее состояние игры."""
        return self.state.to_dict()

# Создаем единственный экземпляр движка, который будет использоваться приложением
engine = SimulationEngine()