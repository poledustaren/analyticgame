import random
import json
import os
import glob
from openrouter_client import OpenRouterClient # Импортируем новый клиент

SAVES_DIR = os.path.join(os.path.dirname(__file__), 'saves')

class GameState:
    """Хранит все данные о текущем состоянии игры. (без изменений)"""
    def __init__(self):
        self.week = 1; self.level = 1; self.revenue = 1000000; self.stability = 80;
        self.morale = 70; self.budget = 500000; self.unplanned_work = 80;
        self.phoenix_progress = 0; self.wip_limit = 99;
        self.chat_history = [{"sender": "System", "text": "Добро пожаловать в симулятор 'Проект Феникс'!"}]
        self.tasks = {"backlog": [{"id": "task-1", "title": "Анализ требований по платежам", "points": 2, "duration": 2, "start_week": None}, {"id": "task-2", "title": "Проектирование архитектуры", "points": 3, "duration": 3, "start_week": None}, {"id": "task-3", "title": "Настройка тестового окружения", "points": 1, "duration": 1, "start_week": None}], "in_progress": [], "review": [], "done": []}
        self.active_events = []

    def to_dict(self): return self.__dict__
    @classmethod
    def from_dict(cls, data):
        instance = cls(); instance.__dict__.update(data); return instance

class MockLLM:
    """Имитирует ответы ИИ-персонажей. (Восстановлено для диагностики)"""
    def __init__(self):
        self.responses = {
            "developer": ["Хм, задача выглядит сложнее.", "Понял, приступаю.", "Нужен четкий API-контракт."],
            "developer_wip_error": ["Наш WIP-лимит превышен! Не могу взять задачу."],
            "manager": ["Команда, ускоряемся.", "Отличный шаг.", "Бюджет не резиновый."],
            "stakeholder": ["Я хочу видеть прогресс.", "Нам нужна эта фича как можно скорее."],
            "ciso": ["Безопасность прежде всего!"], "cfo": ["Почините зарплатную ведомость!"],
            "marketing": ["Наш сайт лежит!"],
            "erik": ["Сколько типов работы вы делаете?", "Вы постоянно тушите пожары.", "Если вы не управляете незапланированной работой, она управляет вами.", "Что замедляет ваш поток?", "У каждой системы есть ограничение."]
        }
    def get_response(self, role, chat_history=None): # Добавляем chat_history для совместимости
        return random.choice(self.responses.get(role, ["..."]))

class OpenRouterLLM:
    """Взаимодействует с LLM через OpenRouter для генерации ответов."""
    def __init__(self, api_key):
        self.client = OpenRouterClient(api_key=api_key)
        self.model = "z-ai/glm-4.5-air:free"
        self.prompts = {
            "developer": "Ты - опытный, но циничный и перегруженный работой старший разработчик. Ты говоришь коротко, по делу, и часто намекаешь на технический долг. Ответь на последнюю реплику.",
            "developer_wip_error": "Ты - разработчик, который не может взять новую задачу из-за WIP-лимита. Скажи, что ты перегружен и не можешь начать новую работу, пока не закончишь текущую.",
            "manager": "Ты - менеджер проекта, сфокусированный на сроках и бюджете. Ты говоришь ободряюще, но всегда напоминаешь о дедлайнах.",
            "stakeholder": "Ты - нетерпеливый и не очень технически подкованный стейкхолдер. Ты хочешь видеть результаты как можно скорее и часто предлагаешь новые 'гениальные' идеи.",
            "ciso": "Ты - директор по информационной безопасности. Твой главный приоритет - безопасность, и ты видишь риски во всем. Говори строго и требуй немедленных действий.",
            "cfo": "Ты - финансовый директор. Тебя волнуют только деньги, расходы и финансовые показатели. Говори прямо и требуй отчета о затратах.",
            "marketing": "Ты - глава отдела маркетинга. Тебя волнует только доступность сайта и пользовательский опыт. Говори эмоционально, подчеркивая потери от простоев.",
            "erik": "Ты - Эрик, загадочный и мудрый ментор. Ты никогда не даешь прямых ответов, а вместо этого задаешь наводящие вопросы, которые заставляют задуматься о процессах, потоке и системных проблемах."
        }

    def get_response(self, role, chat_history):
        system_prompt = self.prompts.get(role, "Ты - обычный ассистент.")

        # Формируем историю для передачи модели
        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            # Добавляем несколько последних сообщений для контекста
            for msg in chat_history[-3:]:
                role_map = {"System": "assistant", "Эрик": "assistant"}
                user_role = role_map.get(msg["sender"], "user")
                messages.append({"role": user_role, "content": f"{msg['sender']}: {msg['text']}"})

        try:
            response = self.client.chat.create(
                model=self.model,
                messages=messages,
                # Мы просим JSON, но бесплатная модель может его не поддерживать, будем парсить текст
            )
            # Извлекаем текстовое содержимое ответа
            content = response.choices[0].message.content
            # Простая очистка ответа
            return content.strip().replace('"', '')
        except Exception as e:
            print(f"Ошибка при обращении к OpenRouter: {e}")
            return "Я... кажется, у меня возникла внутренняя ошибка. Попробуйте еще раз."


class SimulationEngine:
    """Управляет игровыми сессиями с использованием LLM."""
    def __init__(self):
        self.active_game_state = None

        # Проверяем, нужно ли использовать OpenRouter
        use_openrouter = os.getenv("USE_OPENROUTER", "false").lower() == "true"
        api_key = os.getenv("OPENROUTER_API_KEY")

        if use_openrouter and api_key:
            print("USE_OPENROUTER=true и ключ OPENROUTER_API_KEY найдены. Инициализация OpenRouterLLM...")
            try:
                self.llm = OpenRouterLLM(api_key=api_key)
                print("OpenRouterLLM успешно инициализирован.")
            except Exception as e:
                print(f"Ошибка при инициализации OpenRouterLLM: {e}. Откат к MockLLM.")
                self.llm = MockLLM()
        else:
            print("Используется стабильный MockLLM.")
            self.llm = MockLLM()

        if not os.path.exists(SAVES_DIR):
            os.makedirs(SAVES_DIR)

    # ... (методы new_game, save_game, load_game, list_saves, get_current_state без изменений) ...
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
        # ... (остальная логика обработки действий)
        if action_type == 'event_choice': self._handle_event_choice(action)
        elif action_type == 'quiz_answer': self._handle_quiz_answer(action)
        elif action_type == 'task_move': self._handle_task_move(action)
        elif action_type == 'set_wip_limit': self._handle_set_wip_limit(action)
        elif action_type == 'minigame_result': self._handle_minigame_result(action)
        self._check_level_transition()
        return self.active_game_state.to_dict()

    def _initialize_level_1(self):
        # ... (логика инициализации Уровня 1 с использованием LLM)
        self.active_game_state.level = 1
        try:
            self.active_game_state.chat_history.append({"sender": "CFO", "text": self.llm.get_response("cfo", self.active_game_state.chat_history)})
            self.active_game_state.chat_history.append({"sender": "Маркетинг", "text": self.llm.get_response("marketing", self.active_game_state.chat_history)})
            self.active_game_state.chat_history.append({"sender": "CISO", "text": self.llm.get_response("ciso", self.active_game_state.chat_history)})
        except Exception as e:
            self.active_game_state.chat_history.append({"sender": "System", "text": f"Ошибка инициализации LLM: {e}"})
        # ... (остальная логика инициализации)
        self.active_game_state.active_events = [
            {"id": "payroll_outage", "type": "crisis", "title": "Сбой в системе расчета зарплаты!", "text": "Финансовый директор в ярости.", "choices": [{"id": "use_brent", "text": "Отправить Брента"}, {"id": "form_team", "text": "Собрать команду"}]},
            {"id": "website_down", "type": "crisis", "title": "Упал основной сайт!", "text": "Отдел маркетинга сообщает о потерях.", "choices": [{"id": "brent_again", "text": "Снова Брент"}, {"id": "restart_server", "text": "Перезагрузить серверы"}]},
            {"id": "security_audit", "type": "crisis", "title": "Критическая уязвимость!", "text": "Директор по безопасности требует исправить.", "choices": [{"id": "brent_the_savior", "text": "И опять Брент"}, {"id": "accept_risk", "text": "Принять риск"}]}
        ]

    def _initialize_level_2(self):
        # ... (логика инициализации Уровня 2)
        state = self.active_game_state
        state.level = 2; state.wip_limit = 3
        state.chat_history.extend([{"sender": "System", "text": "--- НАЧАЛО УРОВНЯ 2: УВИДЕТЬ ПОТОК ---"}, {"sender": "Эрик", "text": self.llm.get_response("erik", state.chat_history)}])
        state.active_events = [
            {"id": "brent_dilemma", "type": "crisis", "title": "Дилемма Брента", "text": "Брент нужен и для 'Феникса', и для починки старой CRM. Что делать?", "choices": [{"id": "brent_to_phoenix", "text": "Отправить на 'Феникс'"}, {"id": "brent_to_crm", "text": "Отправить чинить CRM"}, {"id": "brent_documents", "text": "Поручить документировать"}]},
            {"id": "flow_minigame", "type": "minigame", "title": "Мини-игра: Балансировщик потока", "text": "Эрик предлагает вам визуализировать работу 'бутылочного горлышка'.", "choices": [{"id": "start_minigame", "text": "Начать"}]}
        ]

    def _initialize_level_3(self):
        state = self.active_game_state
        state.level = 3
        state.chat_history.extend([
            {"sender": "System", "text": "--- НАЧАЛО УРОВНЯ 3: ПЕТЛЯ ОБРАТНОЙ СВЯЗИ ---"},
            {"sender": "Эрик", "text": self.llm.get_response("erik", state.chat_history)}
        ])
        state.active_events = [
            {
                "id": "cab_meeting_1", "type": "cab", "title": "CAB: Срочное развертывание",
                "text": "Маркетинг требует выкатить новую фичу сегодня. Разработчики говорят, что она не до конца протестирована. Ваши действия?",
                "choices": [{"id": "approve_risky", "text": "Одобрить, риск приемлем"}, {"id": "reject_risky", "text": "Отклонить, нужно полное тестирование"}]
            },
            {
                "id": "quality_investment_1", "type": "investment", "title": "Инвестиции в CI/CD",
                "text": "Команда предлагает выделить 20,000 из бюджета на создание базового CI/CD пайплайна для ускорения и безопасности развертываний.",
                "choices": [{"id": "invest_in_ci", "text": "Инвестировать в CI/CD"}, {"id": "save_budget", "text": "Сэкономить бюджет"}]
            }
        ]

    def _check_level_transition(self):
        state = self.active_game_state
        # L1 -> L2
        if state.level == 1 and not state.active_events and state.unplanned_work < 40:
            if not any(e['id'] == 'erik_quiz_1' for e in state.active_events):
                state.chat_history.append({"sender": "Эрик", "text": self.llm.get_response("erik", state.chat_history)})
                state.active_events.append({"id": "erik_quiz_1", "type": "quiz", "title": "Урок от Эрика: Четыре типа работы", "text": "Какой тип работы самый разрушительный для продуктивности?", "choices": [{"id": "unplanned", "text": "Незапланированная работа"}, {"id": "changes", "text": "Изменения"}]})
        # L2 -> L3
        elif state.level == 2 and not any(e['id'] in ['brent_dilemma', 'flow_minigame'] for e in state.active_events):
            if not any(e['id'] == 'erik_quiz_2' for e in state.active_events):
                state.chat_history.append({"sender": "Эрик", "text": self.llm.get_response("erik", state.chat_history)})
                state.active_events.append({"id": "erik_quiz_2", "type": "quiz", "title": "Урок от Эрика: Теория Ограничений", "text": "Что является главным принципом управления 'бутылочным горлышком'?", "choices": [{"id": "load", "text": "Загрузить его на 100%"}, {"id": "protect", "text": "Защищать его и подчинить процесс его ритму"}]})

    # --- Обработчики действий ---
    def _handle_event_choice(self, action):
        state = self.active_game_state
        event = next((e for e in state.active_events if e['id'] == action.get('event_id')), None)
        if not event: return

        # Логика для событий Уровня 3
        if event['id'] == 'cab_meeting_1':
            if action.get('choice_id') == 'approve_risky':
                if random.random() < 0.5: # 50% шанс провала
                    state.stability -= 30; state.unplanned_work += 40
                    state.chat_history.append({"sender": "System", "text": "Катастрофа! Простое изменение обрушило систему аутентификации."})
                else:
                    state.morale += 5; state.chat_history.append({"sender": "System", "text": "Изменение прошло успешно."})
            else: # reject_risky
                state.morale -= 5; state.chat_history.append({"sender": "Маркетинг", "text": "Почему мы не можем сделать даже простую вещь?!"})
        elif event['id'] == 'quality_investment_1':
            if action.get('choice_id') == 'invest_in_ci':
                state.budget -= 20000; state.stability += 15
                state.chat_history.append({"sender": "System", "text": "Инвестиции в CI/CD сделаны. Стабильность повысилась."})
            else: # save_budget
                state.morale -= 5; state.chat_history.append({"sender": "System", "text": "Вы решили сэкономить. Команда разочарована."})
        else:
            # Старая логика для событий Уровня 1 и 2
            state.morale -= 5; state.budget -= 5000; state.unplanned_work -= 25

        state.active_events = [e for e in state.active_events if e['id'] != event['id']]

    def _handle_quiz_answer(self, action):
        state = self.active_game_state
        event_id = action.get('event_id')
        if event_id == 'erik_quiz_1':
            if action.get('choice_id') == 'unplanned':
                state.chat_history.append({"sender": "Эрик", "text": "Верно! Именно она."}); state.phoenix_progress += 20
                self._initialize_level_2()
            else:
                state.chat_history.append({"sender": "Эрик", "text": "Не совсем."}); state.morale -= 10
        elif event_id == 'erik_quiz_2':
            if action.get('choice_id') == 'protect':
                state.chat_history.append({"sender": "Эрик", "text": "Именно. Вы не можете двигаться быстрее, чем ваше самое узкое место."})
                self._initialize_level_3()
            else:
                state.chat_history.append({"sender": "Эрик", "text": "Это приведет лишь к большему хаосу."}); state.morale -= 10

        state.active_events = [e for e in state.active_events if e.get('type') != 'quiz']

    def _handle_task_move(self, action):
        state = self.active_game_state
        if action.get('new_column_id') == 'in_progress' and len(state.tasks['in_progress']) >= state.wip_limit:
            state.morale -= 15; state.chat_history.append({"sender": "Разработчик", "text": self.llm.get_response("developer_wip_error", state.chat_history)})
            # BUG FIX: Возвращаем состояние, чтобы сервер не падал
            return self.active_game_state.to_dict()
        # ... (остальная логика перемещения)
        task_to_move = None
        source_list = state.tasks.get(action.get('old_column_id'))
        if not source_list: return
        for i, task in enumerate(source_list):
            if task['id'] == action.get('task_id'): task_to_move = source_list.pop(i); break
        if task_to_move:
            destination_list = state.tasks.get(action.get('new_column_id'))
            destination_list.append(task_to_move)

    def _handle_set_wip_limit(self, action):
        limit = action.get('limit')
        if isinstance(limit, int) and limit > 0: self.active_game_state.wip_limit = limit

    def _handle_minigame_result(self, action):
        state = self.active_game_state
        if action.get('result') == 'success': state.stability += 15
        else: state.stability -= 15
        state.active_events = [e for e in state.active_events if e.get('type') != 'minigame']

engine = SimulationEngine()