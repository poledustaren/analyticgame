/**
 * Resource Renderer Module
 *
 * Handles rendering of resources and training UI.
 */

import { createAvatarElement } from './board-renderer.js';

/**
 * Render resources in the resource pool
 * @param {Array} resources - Array of resource objects
 */
export function renderResources(resources) {
    const resourcePool = document.getElementById('resource-pool');
    resourcePool.innerHTML = '';
    resources.forEach(res => {
        if (!res.busy_task_id) {
            const avatar = createAvatarElement(res);
            resourcePool.appendChild(avatar);
        }
    });
}

/**
 * Render training section
 * @param {Object} state - Current game state
 */
export function renderTraining(state) {
    const trainingSection = document.getElementById('training-section');
    const trainingStatus = document.getElementById('training-status');
    const trainBtn = document.getElementById('train-btn');

    // Show training section only in Level 2+
    if (state.level >= 2) {
        trainingSection.style.display = 'block';
    } else {
        trainingSection.style.display = 'none';
        return;
    }

    // Update training status
    if (state.training_in_progress) {
        const weeks = state.training_in_progress.weeks_remaining;
        trainingStatus.innerHTML = `
            <p class="training-active">Брент обучает стажера...</p>
            <p class="training-countdown">${weeks} недель(и) осталось</p>
        `;
        trainBtn.disabled = true;
        trainBtn.textContent = 'Training in Progress...';
    } else {
        trainingStatus.innerHTML = `
            <p class="training-idle">Брент может обучить новых разработчиков.</p>
            <p class="training-hint">Обучение займет 3 недели, но снизит зависимость от Брента.</p>
        `;
        trainBtn.disabled = false;
        trainBtn.textContent = 'Train Developer (3 weeks)';
    }
}
