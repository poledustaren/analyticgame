# The Phoenix Project Game

This is an interactive simulation game based on the concepts from the book "The Phoenix Project". It is designed to teach core DevOps principles through gameplay.

The application runs with a Python (Flask) backend and an HTML/CSS/JS frontend.

## Project Structure

- `/frontend`: Contains all the frontend files (`index.html`, `style.css`, `script.js`).
- `/backend`: Contains the Python Flask server (`app.py`) and its dependencies (`requirements.txt`).

## Prerequisites

- Python 3.7+
- `pip` for installing packages

## Setup and Installation

1.  **Clone the repository** (if you haven't already).

2.  **Set up the Gemini API Key (Optional, for Step 3)**:
    - To use the AI Game Master chat feature, you will need a Gemini API key.
    - Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    - Set it as an environment variable in your terminal:
      ```bash
      export GEMINI_API_KEY="YOUR_API_KEY_HERE"
      ```

3.  **Install Python dependencies**:
    - Navigate to the project's root directory in your terminal.
    - Run the following command to install the required packages:
      ```bash
      pip install -r backend/requirements.txt
      ```

## How to Run the Game

1.  **Start the backend server**:
    - From the project's root directory, run the following command:
      ```bash
      python3 backend/app.py
      ```
    - You should see output indicating the server is running on `http://0.0.0.0:5001`.

2.  **Play the game**:
    - Open your web browser and navigate to:
      [http://127.0.0.1:5001](http://127.0.0.1:5001)
    - The game should load, and you can start playing. The simulation will run automatically.
