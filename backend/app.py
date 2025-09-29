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


# --- Маршрут для обслуживания фронтенда ---

@app.route('/')
def serve_index():
    """Отдает главный файл index.html."""
    # Этот маршрут теперь будет обслуживать меню, а не саму игру
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Отключаем reloader для стабильного запуска в тестовой среде
    app.run(debug=True, port=5001, use_reloader=False)