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
        {"id": "dev", "name": "Разработка", "work_items": [], "wip_limit": 3, "capacity": 2},
        {"id": "ops", "name": "Эксплуатация", "work_items": [], "wip_limit": 3, "capacity": 1},
        {"id": "customer", "name": "Заказчик", "work_items": [], "wip_limit": None, "capacity": None}
    ],
    "work_items": {}, # A dictionary to hold all work items by id, e.g., { "item-1": { ... } }
    "tooling": {
        "automated-testing": {"purchased": False},
        "ci-cd-pipeline": {"purchased": False},
        "monitoring": {"purchased": False}
    },
    "config": {
        "defect_chance": 0.3,
        "unplanned_work_chance": 0.15
    }
}

import random
import time
import threading
import os
import json
import google.generativeai as genai
from flask import request

# ... (keep existing game_state variable) ...

work_item_counter = 0
game_over = False

def check_game_over():
    global game_over
    if game_state['stats']['deliveredCount'] >= game_state['stats']['targetDeliveries']:
        print("Game Over: WIN")
        game_over = True
    if game_state['stats']['leakedCount'] >= game_state['stats']['maxLeakedDefects']:
        print("Game Over: LOSS")
        game_over = True

def tick_day():
    with app.app_context():
        # This is the main game loop
        while not game_over:
            time.sleep(5) # Each day is 5 seconds

            game_state['stats']['day'] += 1

            # --- 1. Do Work ---
            for stage in game_state['stages']:
                if stage['capacity'] is None:
                    continue

                work_to_do = stage['capacity']
                for item_id in stage['work_items']:
                    if work_to_do <= 0:
                        break

                    item = game_state['work_items'][item_id]
                    if item['work_done'] < item['work_required']:
                        item['work_done'] += 1
                        work_to_do -= 1

            # --- 2. Move Completed Work ---
            items_to_move = [] # (item_id, source_stage_idx, target_stage_idx)
            for i, stage in enumerate(game_state['stages']):
                if i + 1 >= len(game_state['stages']): # No next stage for customer
                    continue

                for item_id in stage['work_items']:
                    item = game_state['work_items'][item_id]
                    if item['work_done'] >= item['work_required']:
                        items_to_move.append((item_id, i, i + 1))

            for item_id, source_idx, target_idx in items_to_move:
                source_stage = game_state['stages'][source_idx]
                target_stage = game_state['stages'][target_idx]

                # Check WIP of target stage before moving
                if target_stage['wip_limit'] is None or len(target_stage['work_items']) < target_stage['wip_limit']:
                    if item_id in source_stage['work_items']: # Ensure it wasn't already moved
                        source_stage['work_items'].remove(item_id)

                        # If moving to the final stage, process it
                        if target_stage['id'] == 'customer':
                            item_data = game_state['work_items'][item_id]
                            if item_data['is_defect']:
                                game_state['stats']['leakedCount'] += 1
                            elif item_data['type'] == 'business':
                                game_state['stats']['deliveredCount'] += 1

                            # Item is finished, remove it completely
                            del game_state['work_items'][item_id]
                        else:
                            # Otherwise, just move it to the next stage
                            target_stage['work_items'].append(item_id)

                        check_game_over()


            # --- 3. Generate New Work ---
            if not game_over:
                if random.random() < 0.3: # Chance for 'change' can remain static for now
                    add_work_item('change')
                if random.random() < game_state['config']['unplanned_work_chance']:
                    add_work_item('unplanned')

            print(f"Day {game_state['stats']['day']} ticked. Work items: {len(game_state['work_items'])}")


@app.route('/api/game_state')
def get_game_state_api():
    return jsonify(game_state)

def add_work_item(work_type):
    global work_item_counter
    work_item_counter += 1
    item_id = f"item-{work_item_counter}"

    new_item = {
        "id": item_id,
        "numeric_id": work_item_counter,
        "type": work_type,
        "work_required": random.randint(3, 5),
        "work_done": 0,
        "is_defect": random.random() < game_state['config']['defect_chance']
    }
    game_state['work_items'][item_id] = new_item
    game_state['stages'][0]['work_items'].append(item_id) # Add to 'dev' stage
    return new_item

@app.route('/api/add_work', methods=['POST'])
def add_work():
    data = request.json
    work_type = data.get('type')
    if not work_type:
        return jsonify({"error": "Work type is required"}), 400
    add_work_item(work_type)
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

@app.route('/api/purchase_upgrade', methods=['POST'])
def purchase_upgrade():
    data = request.json
    item_id = data.get('itemId')
    tool_id = data.get('toolId')

    item = game_state['work_items'].get(item_id)

    # Validation
    if not item or item['type'] != 'internal':
        return jsonify({"error": "Invalid item for upgrade"}), 400
    if game_state['tooling'][tool_id]['purchased']:
        return jsonify({"error": "Tool already purchased"}), 400

    # Consume the internal project
    for stage in game_state['stages']:
        if item_id in stage['work_items']:
            stage['work_items'].remove(item_id)
            break
    del game_state['work_items'][item_id]

    # Purchase and apply effect
    game_state['tooling'][tool_id]['purchased'] = True
    if tool_id == 'automated-testing':
        game_state['config']['defect_chance'] = 0.05
    elif tool_id == 'ci-cd-pipeline':
        # Find ops stage and increase capacity
        ops_stage = next((s for s in game_state['stages'] if s['id'] == 'ops'), None)
        if ops_stage:
            ops_stage['capacity'] += 1
    elif tool_id == 'monitoring':
        game_state['config']['unplanned_work_chance'] = 0.05

    return jsonify(game_state)


# --- Gemini AI Configuration ---
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable not set. Chat feature will be disabled.")
    genai.configure(api_key="DUMMY_KEY") # Configure with a dummy key to avoid crashing
else:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Chat Endpoint ---
@app.route('/api/chat', methods=['POST'])
def chat():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API key not configured on the server."}), 500

    user_message = request.json.get('message')
    if not user_message:
        return jsonify({"error": "No message provided."}), 400

    # Create the prompt for the AI
    prompt = f"""
    You are a Game Master and expert DevOps coach for the 'Phoenix Project Game'.
    Your role is to analyze the current game state and the user's question, then provide strategic advice.
    Be concise, helpful, and act like a senior team member guiding a manager.

    CURRENT GAME STATE:
    {json.dumps(game_state, indent=2)}

    USER'S QUESTION:
    "{user_message}"

    YOUR ANALYSIS AND ADVICE:
    """

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return jsonify({"reply": response.text})
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": "Failed to get a response from the AI."}), 500


if __name__ == '__main__':
    # Start the game loop in a separate thread
    game_loop_thread = threading.Thread(target=tick_day, daemon=True)
    game_loop_thread.start()

    app.run(debug=False, port=5001, host='0.0.0.0') # debug=False is important for threading
