import random

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
        self.wip_limit = 99 # Начальное значение, фактически без лимита
        self.chat_history = [{"sender": "System", "text": "Добро пожаловать в симулятор 'Проект Феникс'!"}]
        self.tasks = {
            "backlog": [
                {"id": "task-1", "title": "Анализ требований по платежам", "points": 2, "duration": 2, "start_week": None},
                {"id": "task-2", "title": "Проектирование архитектуры", "points": 3, "duration": 3, "start_week": None},
                {"id": "task-3", "title": "Настройка тестового окружения", "points": 1, "duration": 1, "start_week": None},
            ], "in_progress": [], "review": [], "done": []
        }
        self.active_events = []

    def to_dict(self):
        """Преобразует состояние игры в словарь для отправки на фронтенд."""
        return self.__dict__

class MockLLM:
    """Имитирует ответы ИИ-персонажей."""
    def __init__(self):
        self.responses = {
            "developer": ["Хм, задача выглядит сложнее, чем кажется.", "Понял, приступаю.", "Для этого мне нужен четкий API-контракт."],
            "developer_wip_error": ["Наш WIP-лимит превышен! Я не могу взять эту задачу, пока не освободится место."],
            "manager": ["Команда, нам нужно ускорить темп.", "Отлично, это важный шаг.", "Бюджет не резиновый."],
            "stakeholder": ["Я хочу видеть прогресс.", "Нам нужна эта фича как можно скорее.", "А можем мы добавить еще и аналитический модуль?"],
            "ciso": ["Безопасность прежде всего. У нас критические уязвимости!"], "cfo": ["Меня не волнует как, просто почините зарплатную ведомость!"],
            "marketing": ["Наш главный сайт лежит! Рекламная кампания горит!"],
            "erik": ["Интересная ситуация... А сколько разных типов работы вы делаете?", "Выглядит так, будто вы постоянно тушите пожары.", "Если вы не управляете незапланированной работой, она управляет вами.", "Отлично. Теперь, когда вы видите всю работу, вы видите и поток. А что его замедляет?", "У каждой системы есть ограничение. Если вы не управляете им, оно управляет вами."]
        }
    def get_response(self, role): return random.choice(self.responses.get(role, ["..."]))

class SimulationEngine:
    """Управляет основной логикой и состоянием игры."""
    def __init__(self):
        self.state = GameState()
        self.llm = MockLLM()
        self.initialize_level_1()

    def initialize_level_1(self):
        self.state.level = 1
        self.state.chat_history.append({"sender": "CFO", "text": self.llm.get_response("cfo")})
        self.state.chat_history.append({"sender": "Маркетинг", "text": self.llm.get_response("marketing")})
        self.state.chat_history.append({"sender": "CISO", "text": self.llm.get_response("ciso")})
        self.state.active_events = [
            {"id": "payroll_outage", "type": "crisis", "title": "Сбой в системе расчета зарплаты!", "text": "Финансовый директор в ярости.", "choices": [{"id": "use_brent", "text": "Отправить Брента"}, {"id": "form_team", "text": "Собрать команду"}]},
            {"id": "website_down", "type": "crisis", "title": "Упал основной сайт!", "text": "Отдел маркетинга сообщает о потерях.", "choices": [{"id": "brent_again", "text": "Снова Брент"}, {"id": "restart_server", "text": "Перезагрузить серверы"}]},
            {"id": "security_audit", "type": "crisis", "title": "Критическая уязвимость!", "text": "Директор по безопасности требует исправить.", "choices": [{"id": "brent_the_savior", "text": "И опять Брент"}, {"id": "accept_risk", "text": "Принять риск"}]}
        ]

    def initialize_level_2(self):
        self.state.level = 2
        self.state.wip_limit = 3
        self.state.chat_history.extend([
            {"sender": "System", "text": "--- НАЧАЛО УРОВНЯ 2: УВИДЕТЬ ПОТОК ---"},
            {"sender": "Эрик", "text": self.llm.get_response("erik")}
        ])
        self.state.active_events = [
            {"id": "brent_dilemma", "type": "crisis", "title": "Дилемма Брента", "text": "Брент нужен и для 'Феникса', и для починки старой CRM. Что делать?", "choices": [{"id": "brent_to_phoenix", "text": "Отправить на 'Феникс'"}, {"id": "brent_to_crm", "text": "Отправить чинить CRM"}, {"id": "brent_documents", "text": "Поручить документировать"}]},
            {"id": "flow_minigame", "type": "minigame", "title": "Мини-игра: Балансировщик потока", "text": "Эрик предлагает вам визуализировать работу 'бутылочного горлышка'.", "choices": [{"id": "start_minigame", "text": "Начать"}]}
        ]

    def _check_level_transition(self):
        if self.state.level == 1 and not self.state.active_events and self.state.unplanned_work < 40:
            self.state.chat_history.append({"sender": "Эрик", "text": self.llm.get_response("erik")})
            self.state.active_events.append({"id": "erik_quiz_1", "type": "quiz", "title": "Урок от Эрика: Четыре типа работы", "text": "Какой тип работы самый разрушительный для продуктивности?", "choices": [{"id": "biz", "text": "Бизнес-проекты"}, {"id": "internal", "text": "Внутренние проекты"}, {"id": "unplanned", "text": "Незапланированная работа"}, {"id": "changes", "text": "Изменения"}]})

    def process_action(self, action):
        action_type = action.get('type')
        if action_type == 'event_choice': self._handle_event_choice(action)
        elif action_type == 'quiz_answer': self._handle_quiz_answer(action)
        elif action_type == 'task_move': self._handle_task_move(action)
        elif action_type == 'set_wip_limit': self._handle_set_wip_limit(action)
        elif action_type == 'minigame_result': self._handle_minigame_result(action)
        self._check_level_transition()
        return self.state.to_dict()

    def _handle_event_choice(self, action):
        event = next((e for e in self.state.active_events if e['id'] == action.get('event_id')), None)
        if not event: return
        self.state.morale -= 5; self.state.budget -= 5000; self.state.unplanned_work -= 25
        if 'brent' in action.get('choice_id'):
            self.state.phoenix_progress -= 5
            self.state.chat_history.append({"sender": "System", "text": f"Брент героически решил проблему '{event['title']}', но 'Феникс' отложен."})
        else:
            self.state.stability -= 10
            self.state.chat_history.append({"sender": "System", "text": f"Проблема '{event['title']}' решена, но это вызвало риски стабильности."})
        self.state.active_events = [e for e in self.state.active_events if e['id'] != event['id']]

    def _handle_quiz_answer(self, action):
        if action.get('event_id') == 'erik_quiz_1':
            if action.get('choice_id') == 'unplanned':
                self.state.chat_history.append({"sender": "Эрик", "text": "Верно! Именно она. Теперь вы можете ей управлять."})
                self.state.phoenix_progress += 20
                self.initialize_level_2()
            else:
                self.state.chat_history.append({"sender": "Эрик", "text": "Не совсем. Подумайте, что мешает плановой работе?"}); self.state.morale -= 10
            self.state.active_events = [e for e in self.state.active_events if e.get('type') != 'quiz']

    def _handle_task_move(self, action):
        if action.get('new_column_id') == 'in_progress' and len(self.state.tasks['in_progress']) >= self.state.wip_limit:
            self.state.morale -= 15
            self.state.chat_history.append({"sender": "Разработчик", "text": self.llm.get_response("developer_wip_error")})
            return self.state.to_dict() # Возвращаем обновленное состояние
        task_to_move = None
        source_list = self.state.tasks.get(action.get('old_column_id'))
        if not source_list: return
        for i, task in enumerate(source_list):
            if task['id'] == action.get('task_id'): task_to_move = source_list.pop(i); break
        if task_to_move:
            destination_list = self.state.tasks.get(action.get('new_column_id'))
            destination_list.append(task_to_move)
            if action.get('new_column_id') == 'in_progress':
                task_to_move['start_week'] = self.state.week
                self.state.budget -= task_to_move.get('points', 1) * 1500
                self.state.phoenix_progress += 10
            elif action.get('new_column_id') == 'done': self.state.stability += task_to_move.get('points', 1)

    def _handle_set_wip_limit(self, action):
        limit = action.get('limit')
        if isinstance(limit, int) and limit > 0:
            self.state.wip_limit = limit
            self.state.chat_history.append({"sender": "System", "text": f"WIP-лимит установлен на {limit}."})

    def _handle_minigame_result(self, action):
        if action.get('result') == 'success':
            self.state.stability += 15; self.state.budget += 20000
            self.state.chat_history.append({"sender": "System", "text": "Мини-игра пройдена! Поток сбалансирован."})
        else:
            self.state.stability -= 15; self.state.budget -= 30000
            self.state.chat_history.append({"sender": "System", "text": "Мини-игра провалена. Перегрузка привела к сбою."})
        self.state.active_events = [e for e in self.state.active_events if e.get('type') != 'minigame']

    def get_current_state(self):
        return self.state.to_dict()

engine = SimulationEngine()