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

@app.route('/api/dismiss', methods=['POST'])
def dismiss_notification():
    """Отклоняет уведомление (game_over, level_up)."""
    data = request.json
    notification_type = data.get('type')
    return jsonify(engine.dismiss_notification(notification_type))

@app.route('/api/action', methods=['POST'])
def handle_action():
    """Обрабатывает действия игрока в активной сессии."""
    action_data = request.json
    if not action_data or 'type' not in action_data:
        return jsonify({"error": "Invalid action data"}), 400

    new_state = engine.process_action(action_data)
    return jsonify(new_state)

@app.route('/api/llm_response', methods=['POST'])
def get_llm_response():
    """Получает ответ от LLM для указанной роли."""
    data = request.json
    if not data or 'role' not in data:
        return jsonify({"error": "role is required"}), 400

    role = data.get('role')
    response = engine.get_llm_response(role)

    return jsonify({
        "role": role,
        "response": response,
        "llm_mode": engine.llm_mode
    })


# --- Experiment System API (Level 6) ---

@app.route('/api/experiments/templates', methods=['GET'])
def get_experiment_templates():
    """Возвращает список доступных шаблонов экспериментов."""
    from simulation import ExperimentTemplate
    templates = ExperimentTemplate.all_templates()

    # Convert Enums to strings for JSON serialization
    result = []
    for tmpl in templates:
        result.append({
            "id": tmpl["id"],
            "title": tmpl["title"],
            "description": tmpl["description"],
            "type": tmpl["type"].value if hasattr(tmpl["type"], "value") else tmpl["type"],
            "duration_weeks": tmpl["duration_weeks"],
            "cost": tmpl["cost"],
            "risk_level": tmpl["risk_level"],
            "hypothesis": tmpl["hypothesis"]
        })
    return jsonify(result)

@app.route('/api/experiments', methods=['GET'])
def get_experiments():
    """Возвращает список всех экспериментов в текущей игре."""
    state = engine.active_game_state
    if not state:
        return jsonify({"error": "No active game"}), 400

    return jsonify([exp.to_dict() for exp in state.experiments])

@app.route('/api/experiments/create', methods=['POST'])
def create_experiment():
    """Создает новый эксперимент."""
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    engine.process_action({
        'type': 'experiment_create',
        'template_id': data.get('template_id'),
        'custom_data': data.get('custom_data')
    })
    return jsonify(engine.get_current_state())

@app.route('/api/experiments/start', methods=['POST'])
def start_experiment():
    """Запускает эксперимент."""
    data = request.json
    if not data or 'exp_id' not in data:
        return jsonify({"error": "exp_id is required"}), 400

    engine.process_action({
        'type': 'experiment_start',
        'exp_id': data['exp_id']
    })
    return jsonify(engine.get_current_state())

@app.route('/api/experiments/cancel', methods=['POST'])
def cancel_experiment():
    """Отменяет эксперимент."""
    data = request.json
    if not data or 'exp_id' not in data:
        return jsonify({"error": "exp_id is required"}), 400

    engine.process_action({
        'type': 'experiment_cancel',
        'exp_id': data['exp_id']
    })
    return jsonify(engine.get_current_state())

@app.route('/api/check_win', methods=['GET'])
def check_win():
    """Проверяет условия победы для текущего уровня."""
    state = engine.active_game_state
    if not state:
        return jsonify({"error": "No active game"}), 400

    win_conditions = {
        "level": state.level,
        "can_win": False,
        "metrics": {}
    }

    if state.level == 6:
        # Level 6 win condition: Learning rate 80%, Experiment Velocity 70
        win_conditions["metrics"]["learning_rate"] = state.learning_rate
        win_conditions["metrics"]["experiment_velocity"] = state.experiment_velocity
        win_conditions["learning_rate_target"] = 80
        win_conditions["experiment_velocity_target"] = 70
        win_conditions["can_win"] = state.learning_rate >= 80 and state.experiment_velocity >= 70

    return jsonify(win_conditions)


# --- Маршрут для обслуживания фронтенда ---

@app.route('/')
def serve_index():
    """Отдает главный файл index.html."""
    # Этот маршрут теперь будет обслуживать меню, а не саму игру
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Отключаем reloader для стабильного запуска в тестовой среде
    app.run(debug=True, port=5001, use_reloader=False)