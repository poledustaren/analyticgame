/**
 * Level Renderer Module
 *
 * Handles rendering of level progress and level goals.
 */

/**
 * Render level progress display
 * @param {Object} state - Current game state
 * @param {Function} showLevelCompleteModal - Function to show level complete modal
 */
export function renderLevelProgress(state, showLevelCompleteModal) {
    const levelDisplay = document.getElementById('level-display');
    const levelTitle = document.getElementById('level-title');

    // Update level display and title
    levelDisplay.textContent = state.level;

    const titles = {
        1: 'The Stabilizer',
        2: 'The Visualizer',
        3: 'The Feedback Loop',
        4: 'The Teacher',
        5: 'The Experimenter',
        6: 'The Master'
    };
    levelTitle.textContent = titles[state.level] || `Level ${state.level}`;

    // Render level goals
    renderLevelGoals(state);

    // Check for level complete
    if (state.level_complete && showLevelCompleteModal) {
        showLevelCompleteModal(state.level_complete);
    }
}

/**
 * Render level goals
 * @param {Object} state - Current game state
 */
export function renderLevelGoals(state) {
    const goalsList = document.getElementById('level-goals-list');
    if (!goalsList) return;

    const goals = state.level_goals || [];

    if (goals.length === 0) {
        goalsList.innerHTML = '<p class="no-goals">No active goals</p>';
        return;
    }

    goalsList.innerHTML = goals.map(goal => {
        const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
        const isComplete = goal.completed;

        return `
            <div class="level-goal-item ${isComplete ? 'completed' : ''}">
                <span class="level-goal-icon">${goal.icon}</span>
                <div class="level-goal-content">
                    <div class="level-goal-description">${goal.description}</div>
                    <div class="level-goal-progress">
                        <div class="level-goal-bar">
                            <div class="level-goal-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="level-goal-text">${goal.current}/${goal.target}</span>
                    </div>
                </div>
                <div class="level-goal-check">${isComplete ? '✓' : ''}</div>
            </div>
        `;
    }).join('');
}
