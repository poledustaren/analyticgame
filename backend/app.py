from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from simulation import engine # Импортируем наш игровой движок

# Создаем экземпляр Flask приложения
app = Flask(__name__, static_folder='../frontend', static_url_path='/')
CORS(app)  # Включаем CORS для всех маршрутов

# --- API эндпоинты ---

@app.route('/api/state')
def get_state():
    """Возвращает текущее состояние игры от движка симуляции."""
    return jsonify(engine.get_current_state())

@app.route('/api/action', methods=['POST'])
def handle_action():
    """
    Принимает любое действие от пользователя, передает его в движок симуляции
    и возвращает обновленное состояние игры.
    """
    action_data = request.json
    if not action_data or 'type' not in action_data:
        return jsonify({"error": "Invalid action data"}), 400

    # Передаем все данные о действии напрямую в движок
    new_state = engine.process_action(action_data)

    return jsonify(new_state)


# --- Маршрут для обслуживания фронтенда ---

@app.route('/')
def serve_index():
    """Отдает главный файл index.html."""
    return send_from_directory(app.static_folder, 'index.html')

# --- Запуск сервера ---

if __name__ == '__main__':
    # Запускаем сервер в режиме отладки на порту 5001
    app.run(debug=True, port=5001)