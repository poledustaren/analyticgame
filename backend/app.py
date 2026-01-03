from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from simulation import engine # Импортируем наш обновленный движок

app = Flask(__name__, static_folder='../frontend', static_url_path='/')
CORS(app)

# --- Новые API для управления игрой ---

@app.route('/api/new_game', methods=['POST'])
def new_game():
    """Начинает новую игровую сессию."""
    return jsonify(engine.new_game())

@app.route('/api/save_game', methods=['POST'])
def save_game():
    """Сохраняет текущую игру в указанный слот."""
    slot_id = request.json.get('slot_id')
    if not slot_id:
        return jsonify({"error": "slot_id is required"}), 400
    return jsonify(engine.save_game(slot_id))

@app.route('/api/load_game', methods=['POST'])
def load_game():
    """Загружает игру из указанного слота."""
    slot_id = request.json.get('slot_id')
    if not slot_id:
        return jsonify({"error": "slot_id is required"}), 400
    return jsonify(engine.load_game(slot_id))

@app.route('/api/saves', methods=['GET'])
def list_saves():
    """Возвращает список доступных сохранений."""
    return jsonify(engine.list_saves())


# --- Существующие API, теперь работающие с активной сессией ---

@app.route('/api/state')
def get_state():
    """Возвращает текущее состояние активной игры."""
    return jsonify(engine.get_current_state())

@app.route('/api/action', methods=['POST'])
def handle_action():
    """Обрабатывает действия игрока в активной сессии."""
    action_data = request.json
    if not action_data or 'type' not in action_data:
        return jsonify({"error": "Invalid action data"}), 400

    new_state = engine.process_action(action_data)
    return jsonify(new_state)


# --- Sprint API Endpoints ---

@app.route('/api/sprint', methods=['GET'])
def get_sprint():
    """Возвращает текущий спринт."""
    state = engine.get_current_state()
    if 'error' in state:
        return jsonify(state), 400
    return jsonify(state.get('current_sprint'))

@app.route('/api/sprint/advance', methods=['POST'])
def advance_sprint_phase():
    """Переход к следующей фазе спринта."""
    action_data = {'type': 'sprint_advance_phase'}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/sprint/capacity', methods=['POST'])
def set_sprint_capacity():
    """Устанавливает ёмкость спринта."""
    data = request.json
    capacity = data.get('capacity')
    if capacity is None:
        return jsonify({"error": "capacity is required"}), 400
    action_data = {'type': 'sprint_set_capacity', 'capacity': capacity}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/sprint/goal', methods=['POST'])
def add_sprint_goal():
    """Добавляет цель спринта."""
    data = request.json
    goal = data.get('goal')
    if not goal:
        return jsonify({"error": "goal is required"}), 400
    action_data = {'type': 'sprint_add_goal', 'goal': goal}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/sprint/task', methods=['POST'])
def add_sprint_task():
    """Добавляет задачу в бэклог спринта."""
    data = request.json
    task_id = data.get('task_id')
    if not task_id:
        return jsonify({"error": "task_id is required"}), 400
    action_data = {'type': 'sprint_add_task', 'task_id': task_id}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/sprint/task', methods=['DELETE'])
def remove_sprint_task():
    """Удаляет задачу из бэклога спринта."""
    data = request.json
    task_id = data.get('task_id')
    if not task_id:
        return jsonify({"error": "task_id is required"}), 400
    action_data = {'type': 'sprint_remove_task', 'task_id': task_id}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/sprint/note', methods=['POST'])
def add_sprint_note():
    """Добавляет заметку к фазе спринта."""
    data = request.json
    phase = data.get('phase')
    note = data.get('note')
    if not phase or note is None:
        return jsonify({"error": "phase and note are required"}), 400
    action_data = {'type': 'sprint_add_note', 'phase': phase, 'note': note}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/sprint/retro-action', methods=['POST'])
def add_retro_action():
    """Добавляет действие из ретроспективы."""
    data = request.json
    action_text = data.get('action')
    if not action_text:
        return jsonify({"error": "action is required"}), 400
    action_data = {'type': 'sprint_add_retro_action', 'action': action_text}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/sprint/complete', methods=['POST'])
def complete_sprint():
    """Завершает спринт и начинает новый."""
    action_data = {'type': 'sprint_complete'}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/sprint/history', methods=['GET'])
def get_sprint_history():
    """Возвращает историю спринтов."""
    state = engine.get_current_state()
    if 'error' in state:
        return jsonify(state), 400
    return jsonify(state.get('sprint_history', []))


# --- Daily Standup API Endpoints ---

@app.route('/api/standup', methods=['GET'])
def get_standup_status():
    """Возвращает статус ежедневного стендапа."""
    state = engine.get_current_state()
    if 'error' in state:
        return jsonify(state), 400
    return jsonify({
        'completed': state.get('daily_standup_completed', False),
        'team': state.get('team_members', []),
        'answers': state.get('standup_answers', {})
    })

@app.route('/api/standup/answer', methods=['POST'])
def submit_standup_answer():
    """Записывает ответ участника стендапа."""
    data = request.json
    member_id = data.get('member_id')
    if not member_id:
        return jsonify({"error": "member_id is required"}), 400
    action_data = {
        'type': 'daily_standup_answer',
        'member_id': member_id,
        'yesterday': data.get('yesterday', ''),
        'today': data.get('today', ''),
        'blockers': data.get('blockers', '')
    }
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/standup/complete', methods=['POST'])
def complete_standup():
    """Завершает ежедневный стендап."""
    action_data = {'type': 'daily_standup_complete'}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/day/advance', methods=['POST'])
def advance_day():
    """Переход к следующему дню."""
    action_data = {'type': 'advance_day'}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)


# --- CAB API Endpoints ---

@app.route('/api/cab', methods=['GET'])
def get_cab_status():
    """Возвращает статус CAB и ожидающие изменения."""
    state = engine.get_current_state()
    if 'error' in state:
        return jsonify(state), 400
    return jsonify({
        'pending_changes': state.get('pending_changes', []),
        'history': state.get('cab_history', []),
        'meeting_scheduled': state.get('cab_meeting_scheduled', False)
    })

@app.route('/api/cab/submit', methods=['POST'])
def submit_change_request():
    """Создаёт новый запрос на изменение (RFC)."""
    data = request.json
    title = data.get('title')
    if not title:
        return jsonify({"error": "title is required"}), 400
    action_data = {
        'type': 'cab_submit_change',
        'title': title,
        'description': data.get('description', ''),
        'risk_level': data.get('risk_level', 'medium')
    }
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/cab/approve', methods=['POST'])
def approve_change():
    """Одобрить изменение CAB."""
    data = request.json
    change_id = data.get('change_id')
    if not change_id:
        return jsonify({"error": "change_id is required"}), 400
    action_data = {'type': 'cab_approve', 'change_id': change_id}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/cab/reject', methods=['POST'])
def reject_change():
    """Отклонить изменение CAB."""
    data = request.json
    change_id = data.get('change_id')
    if not change_id:
        return jsonify({"error": "change_id is required"}), 400
    action_data = {'type': 'cab_reject', 'change_id': change_id, 'reason': data.get('reason', '')}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/cab/meeting', methods=['POST'])
def schedule_cab_meeting():
    """Запланировать CAB собрание."""
    action_data = {'type': 'cab_schedule_meeting'}
    new_state = engine.process_action(action_data)
    return jsonify(new_state)


# --- Mentor / LLM API Endpoints ---

@app.route('/api/mentor/advice', methods=['GET'])
def get_mentor_advice():
    """Возвращает контекстный совет от Эрика на основе текущего состояния игры."""
    state = engine.get_current_state()
    if 'error' in state:
        return jsonify(state), 400
    advice = engine.llm.get_response('erik', game_state=state)
    return jsonify({'advice': advice, 'sender': 'Erik', 'role': 'mentor'})

@app.route('/api/mentor/event-comment', methods=['POST'])
def get_event_comment():
    """Возвращает комментарий Эрика для события."""
    data = request.json
    event_type = data.get('event_type', 'general')
    comment = engine.llm.get_event_comment(event_type)
    return jsonify({'comment': comment, 'sender': 'Erik', 'role': 'mentor'})

@app.route('/api/mentor/cab-comment', methods=['POST'])
def get_cab_comment():
    """Возвращает комментарий Эрика для CAB."""
    data = request.json
    risk_level = data.get('risk_level', 'medium')
    change_type = data.get('change_type', 'general')
    comment = engine.llm.get_cab_comment(risk_level, change_type)
    return jsonify({'comment': comment, 'sender': 'Erik', 'role': 'mentor'})

@app.route('/api/mentor/standup-tip', methods=['GET'])
def get_standup_tip():
    """Возвращает совет для стендапа на основе текущего состояния."""
    state = engine.get_current_state()
    if 'error' in state:
        return jsonify(state), 400

    blockers_count = len([t for t in state.get('tasks', []) if t.get('blocked')])
    morale = state.get('team_morale', 75)
    tip = engine.llm.get_standup_tip(blockers_count, morale)
    return jsonify({'tip': tip, 'sender': 'Erik', 'role': 'mentor'})


# --- Маршрут для обслуживания фронтенда ---

@app.route('/')
def serve_index():
    """Отдает главный файл index.html."""
    # Этот маршрут теперь будет обслуживать меню, а не саму игру
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Отключаем reloader для стабильного запуска в тестовой среде
    app.run(debug=True, port=5001, use_reloader=False)