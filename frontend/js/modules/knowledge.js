/**
 * Knowledge Module
 *
 * Handles rendering and management of the knowledge metric (Level 4+).
 * Knowledge represents team documentation and knowledge sharing.
 */

/**
 * Render knowledge display
 * @param {Object} state - Current game state
 */
export function renderKnowledge(state) {
    const knowledgeSection = document.getElementById('knowledge-section');
    const knowledgeValue = document.getElementById('knowledge-value');
    const knowledgeBar = document.getElementById('knowledge-bar');
    const knowledgeStatus = document.getElementById('knowledge-status');

    // Show knowledge section only from Level 4
    if (state.level >= 4) {
        knowledgeSection.style.display = 'block';
    } else {
        knowledgeSection.style.display = 'none';
        return;
    }

    const knowledge = state.knowledge || 0;

    // Update knowledge value and bar
    knowledgeValue.textContent = `${knowledge}%`;
    knowledgeBar.style.width = `${knowledge}%`;

    // Update status text and color based on knowledge level
    let statusText = '';
    let statusColor = '';
    let barColor = '';

    if (knowledge >= 80) {
        statusText = 'Excellent';
        statusColor = '#22c55e'; // Green
        barColor = 'linear-gradient(90deg, #22c55e, #16a34a)';
    } else if (knowledge >= 60) {
        statusText = 'Good';
        statusColor = '#84cc16'; // Light green
        barColor = 'linear-gradient(90deg, #84cc16, #65a30d)';
    } else if (knowledge >= 40) {
        statusText = 'Moderate';
        statusColor = '#eab308'; // Yellow
        barColor = 'linear-gradient(90deg, #eab308, #ca8a04)';
    } else if (knowledge >= 20) {
        statusText = 'Low';
        statusColor = '#f97316'; // Orange
        barColor = 'linear-gradient(90deg, #f97316, #ea580c)';
    } else {
        statusText = 'Critical';
        statusColor = '#ef4444'; // Red
        barColor = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }

    knowledgeStatus.textContent = statusText;
    knowledgeStatus.style.color = statusColor;
    knowledgeBar.style.background = barColor;

    // Add animation when knowledge increases significantly
    const prevKnowledge = state._prevKnowledge || 0;
    if (knowledge > prevKnowledge && knowledge - prevKnowledge >= 5) {
        knowledgeBar.classList.add('knowledge-pulse');
        setTimeout(() => {
            knowledgeBar.classList.remove('knowledge-pulse');
        }, 1000);
    }

    // Store previous knowledge for comparison
    state._prevKnowledge = knowledge;
}

/**
 * Check knowledge-related achievements
 * @param {Object} state - Current game state
 * @param {Set} earnedAchievements - Set of earned achievement IDs
 * @param {Function} addAchievement - Function to add an achievement
 */
export function checkKnowledgeAchievements(state, earnedAchievements, addAchievement) {
    if (state.level < 4) return;

    const knowledge = state.knowledge || 0;

    // Knowledge milestones
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

/**
 * Get knowledge status details for UI display
 * @param {number} knowledge - Knowledge value (0-100)
 * @returns {Object} Status details
 */
export function getKnowledgeStatus(knowledge) {
    if (knowledge >= 80) {
        return {
            text: 'Excellent',
            color: '#22c55e',
            tip: 'Great job! Team knowledge is well documented.'
        };
    } else if (knowledge >= 60) {
        return {
            text: 'Good',
            color: '#84cc16',
            tip: 'Keep documenting and sharing knowledge!'
        };
    } else if (knowledge >= 40) {
        return {
            text: 'Moderate',
            color: '#eab308',
            tip: 'Consider more documentation tasks.'
        };
    } else if (knowledge >= 20) {
        return {
            text: 'Low',
            color: '#f97316',
            tip: 'Knowledge silos forming - prioritize knowledge transfer!'
        };
    } else {
        return {
            text: 'Critical',
            color: '#ef4444',
            tip: 'Critical risk! Start documentation and pair programming now!'
        };
    }
}
