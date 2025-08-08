from flask import Flask, jsonify, render_template, request

app = Flask(__name__, static_folder='../frontend', template_folder='../frontend')

@app.route('/')
def index():
    return render_template('index.html')

# This will hold the game's state.
# For a real multi-user app, this should be in a database or a more robust state management solution.
game_state = {
    "stats": {
        "deliveredCount": 0,
        "leakedCount": 0,
        "day": 1,
        "targetDeliveries": 10,
        "maxLeakedDefects": 5
    },
    "stages": [
        {"id": "dev", "name": "Разработка", "work_items": [], "wip_limit": 3},
        {"id": "ops", "name": "Эксплуатация", "work_items": [], "wip_limit": 3},
        {"id": "customer", "name": "Заказчик", "work_items": [], "wip_limit": None}
    ],
    "work_items": {}, # A dictionary to hold all work items by id, e.g., { "item-1": { ... } }
    "tooling": {
        "automated-testing": {"purchased": False},
        "ci-cd-pipeline": {"purchased": False},
        "monitoring": {"purchased": False}
    }
}

import random

# ... (keep existing game_state variable) ...

work_item_counter = 0

@app.route('/api/game_state')
def get_game_state_api():
    return jsonify(game_state)

@app.route('/api/add_work', methods=['POST'])
def add_work():
    global work_item_counter
    data = request.json
    work_type = data.get('type')

    if not work_type:
        return jsonify({"error": "Work type is required"}), 400

    work_item_counter += 1
    item_id = f"item-{work_item_counter}"

    new_item = {
        "id": item_id,
        "numeric_id": work_item_counter,
        "type": work_type,
        "is_defect": random.random() < 0.2 # Placeholder for defect logic
    }

    game_state['work_items'][item_id] = new_item
    game_state['stages'][0]['work_items'].append(item_id) # Add to 'dev' stage

    return jsonify(game_state)

@app.route('/api/move_work', methods=['POST'])
def move_work():
    data = request.json
    item_id = data.get('itemId')
    target_stage_id = data.get('targetStageId')

    # Find the target stage
    target_stage = next((s for s in game_state['stages'] if s['id'] == target_stage_id), None)
    if not target_stage:
        return jsonify({"error": "Target stage not found"}), 404

    # Check WIP limit
    if target_stage['wip_limit'] is not None and len(target_stage['work_items']) >= target_stage['wip_limit']:
        # In a real game, we might add a specific notification for this
        return jsonify({"error": "WIP limit exceeded"}), 400

    # Find and remove item from its current stage
    source_stage = None
    for stage in game_state['stages']:
        if item_id in stage['work_items']:
            source_stage = stage
            stage['work_items'].remove(item_id)
            break

    # Add item to the target stage
    target_stage['work_items'].append(item_id)

    # Here we would add logic for what happens when an item reaches 'customer'
    # For now, just move it.

    return jsonify(game_state)


if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
