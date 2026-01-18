/**
 * UI Renderer Module
 *
 * Handles rendering of logs, achievements, pipeline, and utility functions.
 */

/**
 * Render logs (mentor and team messages)
 * @param {Array} mentorMessages - Array of mentor message objects
 * @param {Array} teamMessages - Array of team message objects
 */
export function renderLogs(mentorMessages, teamMessages) {
    const mentorLog = document.getElementById('mentor-log');
    const chatLog = document.getElementById('chat-log');

    // Simple rebuild
    mentorLog.innerHTML = mentorMessages.map(msg => `
        <div class="log-message sender-eric">
            <strong>${msg.sender}</strong>: ${msg.text}
        </div>
    `).join('');
    mentorLog.scrollTop = mentorLog.scrollHeight;

    chatLog.innerHTML = teamMessages.map(msg => `
        <div class="log-message">
            <strong>${msg.sender}</strong>: ${msg.text}
        </div>
    `).join('');
    chatLog.scrollTop = chatLog.scrollHeight;
}

/**
 * Render achievements based on state
 * @param {Object} state - Current game state
 * @param {Set} earnedAchievements - Set of earned achievement IDs
 * @param {Function} addAchievement - Function to add an achievement
 */
export function renderAchievements(state, earnedAchievements, addAchievement) {
    // Check for achievements based on state

    // Level completion achievement
    if (state.level >= 2 && !earnedAchievements.has('level-1-complete')) {
        addAchievement('level-1-complete', '🎯', 'Level 1 Complete', 'level-complete');
    }
    if (state.level >= 3 && !earnedAchievements.has('level-2-complete')) {
        addAchievement('level-2-complete', '⭐', 'Level 2 Complete', 'level-complete');
    }

    // Sprint completion achievement
    const velocityHistory = state.velocity_history || [];
    if (velocityHistory.length >= 1 && !earnedAchievements.has('first-sprint')) {
        addAchievement('first-sprint', '🏁', 'First Sprint', 'sprint-complete');
    }
    if (velocityHistory.length >= 3 && !earnedAchievements.has('sprint-veteran')) {
        addAchievement('sprint-veteran', '🎖️', 'Sprint Veteran', 'sprint-complete');
    }

    // High velocity achievement (100% sprint completion)
    if (velocityHistory.length > 0) {
        const lastSprint = velocityHistory[velocityHistory.length - 1];
        if (lastSprint.planned > 0 && lastSprint.actual >= lastSprint.planned) {
            if (!earnedAchievements.has('perfect-sprint')) {
                addAchievement('perfect-sprint', '💯', 'Perfect Sprint', 'goal-complete');
            }
        }
    }

    // Stability achievement
    if (state.stability >= 80 && !earnedAchievements.has('stable-team')) {
        addAchievement('stable-team', '🛡️', 'Stable Team', 'goal-complete');
    }

    // Low unplanned work achievement
    if (state.unplanned_work <= 20 && !earnedAchievements.has('under-control')) {
        addAchievement('under-control', '✨', 'Under Control', 'goal-complete');
    }

    // Knowledge achievements (Level 4+)
    if (state.level >= 4) {
        const knowledge = state.knowledge || 0;
        if (knowledge >= 25 && !earnedAchievements.has('knowledge-25')) {
            addAchievement('knowledge-25', '📚', 'Knowledge Apprentice', 'knowledge-milestone');
        }
        if (knowledge >= 50 && !earnedAchievements.has('knowledge-50')) {
            addAchievement('knowledge-50', '🎓', 'Knowledge Sharer', 'knowledge-milestone');
        }
        if (knowledge >= 75 && !earnedAchievements.has('knowledge-75')) {
            addAchievement('knowledge-75', '🏆', 'Knowledge Expert', 'knowledge-milestone');
        }
        if (knowledge >= 90 && !earnedAchievements.has('knowledge-90')) {
            addAchievement('knowledge-90', '⭐', 'Knowledge Master', 'knowledge-milestone');
        }
    }
}

/**
 * Render CI/CD pipeline
 * @param {Object} state - Current game state
 */
export function renderPipeline(state) {
    const cicdSection = document.getElementById('cicd-section');
    const pipelineCreateBtn = document.getElementById('pipeline-create-btn');
    const pipelineStartBtn = document.getElementById('pipeline-start-btn');
    const pipelineAdvanceBtn = document.getElementById('pipeline-advance-btn');
    const pipelineResetBtn = document.getElementById('pipeline-reset-btn');
    const pipelineAutomateBtn = document.getElementById('pipeline-automate-btn');
    const pipelineContainer = document.getElementById('pipeline-container');
    const pipelineStages = document.getElementById('pipeline-stages');
    const pipelineStats = document.getElementById('pipeline-stats');

    // Show CI/CD section only from Level 3
    if (state.level >= 3) {
        cicdSection.style.display = 'block';
    } else {
        cicdSection.style.display = 'none';
        return;
    }

    const pipeline = state.cicd_pipeline;

    if (!pipeline) {
        // No pipeline created yet
        pipelineCreateBtn.style.display = 'inline-block';
        pipelineStartBtn.style.display = 'none';
        pipelineAdvanceBtn.style.display = 'none';
        pipelineResetBtn.style.display = 'none';
        pipelineAutomateBtn.style.display = 'none';
        pipelineContainer.style.display = 'block';
        pipelineContainer.innerHTML = '<div class="pipeline-empty">Create a pipeline to visualize your deployment process (Level 3+)</div>';
        pipelineStages.style.display = 'none';
        pipelineStats.style.display = 'none';
    } else {
        // Pipeline exists
        pipelineCreateBtn.style.display = 'none';
        pipelineStartBtn.style.display = 'inline-block';
        pipelineAdvanceBtn.style.display = 'inline-block';
        pipelineResetBtn.style.display = 'inline-block';
        pipelineAutomateBtn.style.display = pipeline.is_automated ? 'none' : 'inline-block';
        pipelineContainer.style.display = 'none';
        pipelineStages.style.display = 'flex';
        pipelineStats.style.display = 'flex';

        // Update coverage bar
        const coverage = pipeline.coverage || state.cicd_coverage || 0;
        document.getElementById('cicd-coverage-bar').style.width = `${coverage}%`;
        document.getElementById('cicd-coverage-text').textContent = `${coverage}%`;

        // Update test coverage bar
        const testCoverage = pipeline.test_coverage || 0;
        const testCount = pipeline.test_count || 0;
        const passingTests = pipeline.passing_tests || testCount;
        document.getElementById('test-coverage-bar').style.width = `${testCoverage}%`;
        document.getElementById('test-coverage-text').textContent = `${testCoverage}% (${passingTests}/${testCount} tests passing)`;

        // Update stats
        document.getElementById('pipeline-runs').textContent = pipeline.total_runs || 0;
        document.getElementById('pipeline-success').textContent = pipeline.successful_runs || 0;
        document.getElementById('pipeline-failed').textContent = pipeline.failed_runs || 0;

        // Render stages
        const stageElements = pipelineStages.querySelectorAll('.pipeline-stage');
        const arrows = pipelineStages.querySelectorAll('.pipeline-arrow');

        let foundCurrent = false;
        stageElements.forEach((stageEl, index) => {
            const stageName = stageEl.dataset.stage;
            const stageData = pipeline.stages[stageName];

            stageEl.classList.remove('active', 'success', 'failed', 'pending');

            if (stageData) {
                if (stageData.status === 'running') {
                    stageEl.classList.add('active');
                    foundCurrent = true;
                } else if (stageData.status === 'success') {
                    stageEl.classList.add('success');
                } else if (stageData.status === 'failed') {
                    stageEl.classList.add('failed');
                } else {
                    stageEl.classList.add('pending');
                }
            }
        });

        // Update arrows
        arrows.forEach((arrow, index) => {
            arrow.classList.remove('active', 'success');
            if (index < stageElements.length - 1) {
                const currentStage = stageElements[index];
                if (currentStage.classList.contains('success')) {
                    arrow.classList.add('success');
                } else if (currentStage.classList.contains('active')) {
                    arrow.classList.add('active');
                }
            }
        });
    }
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date string
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(isoString) {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
