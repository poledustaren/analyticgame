/**
 * Game State Management Module
 *
 * Manages the application state including current game state,
 * sprint planning, and achievement tracking.
 */

// State variables
let currentState = null;
let planningSprintTasks = []; // Tasks selected during planning
let earnedAchievements = new Set(); // Track earned achievements

// Planning Poker state
let currentPokerTask = null;
let selectedPokerValue = null;
let teamEstimates = [];

// Drag and drop state
let draggedElement = null;
let dragType = null;

/**
 * Get the current application state
 * @returns {Object|null} The current state object or null if not initialized
 */
function getState() {
    return currentState;
}

/**
 * Set the current application state
 * @param {Object} state - The new state object
 */
function setState(state) {
    currentState = state;
}

/**
 * Update the current state with new data
 * @param {Object} newState - The new state data to merge/set
 */
function updateState(newState) {
    currentState = newState;
}

/**
 * Get current sprint planning tasks
 * @returns {Array} Array of task IDs selected for sprint
 */
function getPlanningSprintTasks() {
    return planningSprintTasks;
}

/**
 * Set sprint planning tasks
 * @param {Array} tasks - Array of task IDs for sprint planning
 */
function setPlanningSprintTasks(tasks) {
    planningSprintTasks = tasks;
}

/**
 * Add a task to sprint planning
 * @param {string} taskId - Task ID to add
 */
function addPlanningSprintTask(taskId) {
    if (!planningSprintTasks.includes(taskId)) {
        planningSprintTasks.push(taskId);
    }
}

/**
 * Remove a task from sprint planning
 * @param {string} taskId - Task ID to remove
 */
function removePlanningSprintTask(taskId) {
    planningSprintTasks = planningSprintTasks.filter(id => id !== taskId);
}

/**
 * Check if an achievement has been earned
 * @param {string} achievementId - Achievement ID to check
 * @returns {boolean} True if achievement has been earned
 */
function hasAchievement(achievementId) {
    return earnedAchievements.has(achievementId);
}

/**
 * Mark an achievement as earned
 * @param {string} achievementId - Achievement ID to mark
 */
function addAchievement(achievementId) {
    earnedAchievements.add(achievementId);
}

/**
 * Get all earned achievements
 * @returns {Set} Set of earned achievement IDs
 */
function getAchievements() {
    return earnedAchievements;
}

/**
 * Reset all achievements (for new game)
 */
function resetAchievements() {
    earnedAchievements = new Set();
}

/**
 * Get current poker task
 * @returns {Object|null} Current planning poker task
 */
function getPokerTask() {
    return currentPokerTask;
}

/**
 * Set current poker task
 * @param {Object} task - Task object for planning poker
 */
function setPokerTask(task) {
    currentPokerTask = task;
}

/**
 * Get selected poker value
 * @returns {number|null} Selected poker estimate value
 */
function getPokerValue() {
    return selectedPokerValue;
}

/**
 * Set selected poker value
 * @param {number} value - Poker estimate value
 */
function setPokerValue(value) {
    selectedPokerValue = value;
}

/**
 * Get team estimates from planning poker
 * @returns {Array} Array of team member estimates
 */
function getTeamEstimates() {
    return teamEstimates;
}

/**
 * Set team estimates
 * @param {Array} estimates - Array of team member estimates
 */
function setTeamEstimates(estimates) {
    teamEstimates = estimates;
}

/**
 * Add team estimate
 * @param {Object} estimate - Estimate object with memberId and value
 */
function addTeamEstimate(estimate) {
    teamEstimates.push(estimate);
}

/**
 * Reset poker state
 */
function resetPokerState() {
    currentPokerTask = null;
    selectedPokerValue = null;
    teamEstimates = [];
}

/**
 * Get dragged element
 * @returns {HTMLElement|null} Currently dragged element
 */
function getDraggedElement() {
    return draggedElement;
}

/**
 * Set dragged element
 * @param {HTMLElement} element - Element being dragged
 */
function setDraggedElement(element) {
    draggedElement = element;
}

/**
 * Get drag type
 * @returns {string|null} Type of drag ('task' or 'resource')
 */
function getDragType() {
    return dragType;
}

/**
 * Set drag type
 * @param {string} type - Type of drag operation
 */
function setDragType(type) {
    dragType = type;
}

/**
 * Reset drag state
 */
function resetDragState() {
    draggedElement = null;
    dragType = null;
}

/**
 * Reset all state to initial values (for new game)
 */
function resetAllState() {
    currentState = null;
    planningSprintTasks = [];
    earnedAchievements = new Set();
    currentPokerTask = null;
    selectedPokerValue = null;
    teamEstimates = [];
    draggedElement = null;
    dragType = null;
}

// Export state and functions
export {
    // Main state
    currentState,
    getState,
    setState,
    updateState,

    // Sprint planning
    planningSprintTasks,
    getPlanningSprintTasks,
    setPlanningSprintTasks,
    addPlanningSprintTask,
    removePlanningSprintTask,

    // Achievements
    earnedAchievements,
    hasAchievement,
    addAchievement,
    getAchievements,
    resetAchievements,

    // Planning poker
    currentPokerTask,
    getPokerTask,
    setPokerTask,
    selectedPokerValue,
    getPokerValue,
    setPokerValue,
    teamEstimates,
    getTeamEstimates,
    setTeamEstimates,
    addTeamEstimate,
    resetPokerState,

    // Drag and drop
    draggedElement,
    getDraggedElement,
    setDraggedElement,
    dragType,
    getDragType,
    setDragType,
    resetDragState,

    // Global reset
    resetAllState
};
