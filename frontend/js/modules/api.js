/**
 * API Module for Phoenix Project Game
 * Handles all server communication for game state and actions
 */

const API_BASE_URL = 'http://127.0.0.1:5001/api';

/**
 * Fetch current game state from server
 * @returns {Promise<Object>} Game state object
 */
export async function fetchState() {
    try {
        const response = await fetch(`${API_BASE_URL}/state`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const state = await response.json();
        return state;
    } catch (error) {
        console.error('Failed to fetch state:', error);
        throw error;
    }
}

/**
 * Send an action to the game server
 * @param {Object} actionData - Action object to send
 * @returns {Promise<Object|null>} New game state or null on error
 */
export async function sendAction(actionData) {
    try {
        const response = await fetch(`${API_BASE_URL}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actionData),
        });
        const newState = await response.json();
        return newState;
    } catch (error) {
        console.error('Action failed:', error);
        throw error;
    }
}

/**
 * Save current game to a specific slot
 * @param {string} slotId - Slot identifier (e.g., 'slot1', 'slot2')
 * @param {string|null} saveName - Optional name for the save
 * @returns {Promise<Object>} Response with success status
 */
export async function saveGame(slotId, saveName = null) {
    try {
        const response = await fetch(`${API_BASE_URL}/save_game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slot_id: slotId,
                name: saveName
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Save error:', error);
        throw error;
    }
}

/**
 * Load a game from a specific slot
 * @param {string} slotId - Slot identifier (e.g., 'slot1', 'slot2')
 * @returns {Promise<Object>} Response with success status and state
 */
export async function loadGame(slotId) {
    try {
        const response = await fetch(`${API_BASE_URL}/load_game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot_id: slotId })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Load error:', error);
        throw error;
    }
}

/**
 * List all available save slots
 * @returns {Promise<Array>} Array of save slot objects
 */
export async function listSaves() {
    try {
        const response = await fetch(`${API_BASE_URL}/saves`);
        const data = await response.json();
        return data.saves || [];
    } catch (error) {
        console.error('Failed to list saves:', error);
        throw error;
    }
}

/**
 * Start a new game
 * @returns {Promise<Object>} Initial game state
 */
export async function startNewGame() {
    try {
        const response = await fetch(`${API_BASE_URL}/new_game`, {
            method: 'POST'
        });
        const state = await response.json();
        return state;
    } catch (error) {
        console.error('Failed to start game:', error);
        throw error;
    }
}
