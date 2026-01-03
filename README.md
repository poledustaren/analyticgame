# The Phoenix Project Simulator

> A browser-based simulation game for training analysts in real-world software development processes.

## Overview

Phoenix Simulator is an educational game based on concepts from *"The Phoenix Project"* novel. It teaches IT operations and DevOps principles through interactive gameplay where players manage development workflows, handle crises, and learn to optimize flow.

**Language**: Russian (UI and documentation)

## Features

- **Interactive Kanban Board** - Drag-and-drop task management with four work types
- **Resource Management** - Assign team members (like Brent, the bottleneck engineer)
- **WIP Limits** - Learn the importance of limiting work in progress
- **Multi-Level Progression** - Complete objectives to unlock new concepts
- **Real-time Metrics** - Track budget, stability, unplanned work percentage
- **Mentor Guidance** - Erik provides hints and teaches core concepts

## Game Concepts

### Four Types of Work

Based on The Phoenix Project methodology:

| Type | Description | Color |
|------|-------------|-------|
| **Business** | Strategic projects delivering business value | Green |
| **Internal** | Technical debt and infrastructure improvements | Blue |
| **Changes** | Planned changes and updates | Orange |
| **Unplanned** | Emergencies, incidents, fire-fighting | Red |

### Game Levels

1. **Level 1: The Stabilizer** - Survive the chaos, reduce unplanned work from 80% to 40%
2. **Level 2: The First Way (Flow)** - Learn to visualize flow, identify bottlenecks, apply WIP limits
3. **Level 3: Feedback** - (Planned) Implement quality practices and change management
4. **Level 4: Culture** - (Planned) Build a culture of continuous improvement

## Installation

### Prerequisites

- Python 3.8+
- pip (Python package manager)

### Setup

1. Clone the repository:
```bash
cd /path/to/anala/polecats/furiosa
```

2. Install backend dependencies:
```bash
pip install -r backend/requirements.txt
```

3. Run the server:
```bash
cd backend
python app.py
```

4. Open your browser:
```
http://127.0.0.1:5001
```

## Project Structure

```
furiosa/
├── backend/
│   ├── app.py              # Flask server and API endpoints
│   ├── simulation.py       # Game logic and state management
│   ├── requirements.txt    # Python dependencies
│   └── saves/             # Saved game files (auto-created)
├── frontend/
│   ├── index.html         # Main application UI
│   ├── style.css          # Styling
│   └── script.js          # Client-side logic
├── ARCHITECTURE.md        # Technical architecture details
├── Concept.md             # Original concept document
├── SCENARIOS.md           # Game scenarios and level designs
└── README.md              # This file
```

## API Reference

### Game Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/new_game` | POST | Start a new game session |
| `/api/save_game` | POST | Save current game to slot |
| `/api/load_game` | POST | Load game from slot |
| `/api/saves` | GET | List available save slots |

### Gameplay

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state` | GET | Get current game state |
| `/api/action` | POST | Submit player action |

### Action Types

```json
// Move task between columns
{
  "type": "task_move",
  "task_id": "task-pay-1",
  "old_column_id": "backlog",
  "new_column_id": "in_progress"
}

// Assign resource to task
{
  "type": "assign_resource",
  "resource_id": "brent",
  "task_id": "task-pay-1"
}

// Set WIP limit
{
  "type": "set_wip_limit",
  "limit": 3
}
```

## Dependencies

### Backend
- **Flask** - Web framework
- **Flask-Cors** - CORS support
- **openrouter-client-unofficial** - LLM integration (future)

### Frontend
- Vanilla JavaScript (no frameworks)
- Google Fonts (Inter)

## How to Play

1. **Start the game** - The server initializes with Level 1: three critical incidents
2. **Assign resources** - Drag Brent to critical tasks to unblock them
3. **Move tasks** - Drag cards through Backlog → In Progress → Review → Done
4. **Watch metrics** - Keep unplanned work under control
5. **Listen to Erik** - Your mentor provides key insights
6. **Complete Level 1** - Resolve all three critical incidents
7. **Advance to Level 2** - Learn about WIP limits and flow

## Key Mechanics

### Brent Bottleneck
Brent is your only engineer who can handle critical tasks. He represents the system constraint - everything that requires him is limited by his availability.

### WIP Limits
Starting Level 2, you must limit work in progress. Attempting to exceed the limit triggers warnings from Erik.

### Task Assignment
Some tasks require specific resources. Without assigning the right resource, the task remains blocked.

## Development

### Running in Development

```bash
cd backend
python app.py
```

Server runs on `http://127.0.0.1:5001` with debug mode enabled.

### Save File Format

Games are saved as JSON in `backend/saves/save_<slot_id>.json`:

```json
{
  "week": 1,
  "level": 1,
  "budget": 500000,
  "stability": 80,
  "morale": 70,
  "unplanned_work": 80,
  "tasks": {
    "backlog": [...],
    "in_progress": [...],
    "review": [...],
    "done": [...]
  },
  "resources": [...],
  "chat_history": [...],
  "mentor_log": [...]
}
```

## Future Enhancements

- [ ] Full LLM integration for dynamic character responses
- [ ] Levels 3 and 4 implementation
- [ ] Gantt chart visualization
- [ ] More sophisticated event system
- [ ] Multiplayer mode
- [ ] Custom scenario editor

## License

This is an educational project for internal use.

## Credits

Inspired by *"The Phoenix Project"* by Gene Kim, Kevin Behr, and George Spafford.
