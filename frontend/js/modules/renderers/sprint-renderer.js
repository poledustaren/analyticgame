/**
 * Sprint Renderer Module
 *
 * Handles rendering of sprint panel, velocity chart, and sprint-related UI.
 */

/**
 * Render sprint panel
 * @param {Object} state - Current game state
 * @param {HTMLElement} sprintBtn - Sprint button element
 * @param {Function} showReviewModal - Function to show review modal
 */
export function renderSprintPanel(state, sprintBtn, showReviewModal) {
    const sprint = state.current_sprint;
    const sprintStatus = document.getElementById('sprint-status');
    const sprintPhasesBar = document.getElementById('sprint-phases-bar');
    const sprintGoalText = document.getElementById('sprint-goal-text');
    const standupBtn = document.getElementById('standup-btn');

    if (!sprint) {
        // No active sprint
        sprintStatus.innerHTML = '<p class="no-sprint">No active sprint</p>';
        sprintBtn.textContent = 'Start Sprint';
        sprintBtn.className = 'sprint-btn';
        sprintPhasesBar.style.display = 'none';
        sprintGoalText.textContent = '-';
        if (standupBtn) standupBtn.style.display = 'none';
        return;
    }

    // Active sprint exists
    sprintPhasesBar.style.display = 'flex';
    sprintGoalText.textContent = sprint.goal || '-';

    // Update phase indicators
    const phases = ['planning', 'active', 'review', 'retro'];
    const phaseIndex = phases.indexOf(sprint.phase);

    document.querySelectorAll('.phase').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx < phaseIndex) {
            el.classList.add('completed');
        } else if (idx === phaseIndex) {
            el.classList.add('active');
        }
    });

    // Update sidebar sprint status
    const phaseEmoji = {
        planning: '📋',
        active: '🚀',
        review: '👀',
        retro: '💡'
    };

    sprintStatus.innerHTML = `
        <div class="sprint-info">
            <div class="sprint-info-phase">
                <span>${phaseEmoji[sprint.phase] || '📋'}</span>
                <span>Sprint ${sprint.id}</span>
            </div>
            <div class="sprint-info-goal">"${sprint.goal || 'No goal set'}"</div>
            ${sprint.phase === 'active' ? `
            <div class="sprint-info-velocity">
                <span>Planned: ${sprint.planned_velocity} pts</span>
                <span>Week ${sprint.current_week}/${sprint.duration_weeks}</span>
            </div>
            ` : ''}
        </div>
    `;

    // Update button based on phase
    if (sprint.phase === 'planning') {
        sprintBtn.textContent = 'Launch Sprint';
        sprintBtn.className = 'sprint-btn';
        if (standupBtn) standupBtn.style.display = 'none';
    } else if (sprint.phase === 'active') {
        sprintBtn.textContent = 'End Sprint';
        sprintBtn.className = 'sprint-btn secondary';
        // Show standup button during active phase
        if (standupBtn) {
            if (state.daily_standup_available) {
                standupBtn.style.display = 'block';
                standupBtn.classList.add('pulse');
            } else {
                standupBtn.style.display = 'none';
                standupBtn.classList.remove('pulse');
            }
        }
    } else if (sprint.phase === 'review') {
        // Review modal should be open
        if (showReviewModal) showReviewModal(sprint, state);
        if (standupBtn) standupBtn.style.display = 'none';
    } else if (sprint.phase === 'retro') {
        // Retro modal should be open
        sprintBtn.textContent = 'In Retro';
        sprintBtn.className = 'sprint-btn secondary';
        if (standupBtn) standupBtn.style.display = 'none';
    }
}

/**
 * Render velocity chart
 * @param {Array} velocityHistory - Array of velocity objects
 */
export function renderVelocity(velocityHistory) {
    const velocityChart = document.getElementById('velocity-chart');

    if (!velocityHistory || velocityHistory.length === 0) {
        velocityChart.innerHTML = '<div class="velocity-empty">Complete sprints to see velocity trend</div>';
        return;
    }

    const maxVelocity = Math.max(
        ...velocityHistory.map(v => Math.max(v.planned, v.actual))
    );

    velocityChart.innerHTML = velocityHistory.map(v => {
        const plannedHeight = maxVelocity > 0 ? (v.planned / maxVelocity) * 80 : 0;
        const actualHeight = maxVelocity > 0 ? (v.actual / maxVelocity) * 80 : 0;

        return `
            <div class="velocity-bar-group">
                <div class="velocity-bars">
                    <div class="velocity-bar planned" style="height: ${plannedHeight}px" title="Planned: ${v.planned}"></div>
                    <div class="velocity-bar actual" style="height: ${actualHeight}px" title="Actual: ${v.actual}"></div>
                </div>
                <span class="velocity-label">S${v.sprint_id}</span>
            </div>
        `;
    }).join('');
}
