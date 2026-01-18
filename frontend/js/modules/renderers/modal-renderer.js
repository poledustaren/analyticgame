/**
 * Modal Renderer Module
 *
 * Handles rendering of modal content: planning tasks, sprint backlog, event choices, and save slots.
 */

import { escapeHtml, formatDate } from './ui-renderer.js';

/**
 * Render planning tasks in planning modal
 * @param {Object} currentState - Current game state
 * @param {Function} renderSprintBacklog - Function to render sprint backlog
 * @param {Function} addToSprintBacklog - Function to add task to sprint
 */
export function renderPlanningTasks(currentState, renderSprintBacklog, addToSprintBacklog) {
    const planningBacklog = document.getElementById('planning-backlog');

    if (!currentState) return;

    const backlogTasks = currentState.tasks.backlog || [];
    const sprintTaskIds = currentState.current_sprint?.task_ids || [];

    // Get tasks NOT already in sprint
    const availableTasks = backlogTasks.filter(t => !sprintTaskIds.includes(t.id));

    // Render available tasks
    planningBacklog.innerHTML = availableTasks.map(task => `
        <div class="planning-task-item" data-task-id="${task.id}">
            <h5>${task.title}</h5>
            <p>${task.description || ''}</p>
            <span class="task-points">${task.points} pts</span>
        </div>
    `).join('');

    // Render sprint backlog
    renderSprintBacklog();

    // Add click handlers to available tasks
    planningBacklog.querySelectorAll('.planning-task-item').forEach(item => {
        item.onclick = () => addToSprintBacklog(item.dataset.taskId);
    });
}

/**
 * Render sprint backlog in planning modal
 * @param {Object} currentState - Current game state
 * @param {Array} planningSprintTasks - Array of sprint task IDs
 * @param {Function} removeFromSprintBacklog - Function to remove task from sprint
 */
export function renderSprintBacklog(currentState, planningSprintTasks, removeFromSprintBacklog) {
    const planningSprintBacklog = document.getElementById('planning-sprint-backlog');
    const sprintVelocityPreview = document.getElementById('sprint-velocity-preview');

    if (!currentState) return;

    const sprintTaskIds = currentState.current_sprint?.task_ids || planningSprintTasks;
    const allTasks = [
        ...(currentState.tasks.backlog || []),
        ...(currentState.tasks.in_progress || []),
        ...(currentState.tasks.review || [])
    ];

    const sprintTasks = allTasks.filter(t => sprintTaskIds.includes(t.id));

    // Calculate total points
    const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    sprintVelocityPreview.textContent = `${totalPoints} pts`;

    planningSprintBacklog.innerHTML = sprintTasks.map(task => `
        <div class="planning-task-item" data-task-id="${task.id}">
            <h5>${task.title}</h5>
            <p>${task.description || ''}</p>
            <span class="task-points">${task.points} pts</span>
        </div>
    `).join('');

    // Add click handlers to sprint tasks (remove on click)
    planningSprintBacklog.querySelectorAll('.planning-task-item').forEach(item => {
        item.onclick = () => removeFromSprintBacklog(item.dataset.taskId);
    });
}

/**
 * Render event choices in event modal
 * @param {Array} choices - Array of choice objects
 * @param {Function} handleEventChoice - Function to handle event choice
 */
export function renderEventChoices(choices, handleEventChoice) {
    const eventChoices = document.getElementById('event-choices');
    eventChoices.innerHTML = '';

    choices.forEach((choice, index) => {
        const choiceEl = document.createElement('div');
        choiceEl.className = 'event-choice';
        choiceEl.dataset.choiceId = choice.id;

        // Extract icon from choice text if present
        const iconMatch = choice.text.match(/^([\p{Emoji}\u200d]+)\s/u);
        const choiceIcon = iconMatch ? iconMatch[1] : '';
        const choiceText = iconMatch ? choice.text.substring(2) : choice.text;

        // Build choice HTML
        let html = `
            <div class="event-choice-text">
                ${choiceIcon ? `<span class="event-choice-icon">${choiceIcon}</span>` : ''}
                <span>${choiceText}</span>
            </div>
        `;

        // Add consequences if available
        if (choice.consequences && Object.keys(choice.consequences).length > 0) {
            html += '<div class="event-choice-consequences">';

            for (const [key, value] of Object.entries(choice.consequences)) {
                const consequenceClass = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
                const sign = value > 0 ? '+' : '';
                const label = formatConsequenceKey(key);

                html += `<span class="event-consequence ${consequenceClass}">${label}: ${sign}${value}</span>`;
            }

            html += '</div>';
        }

        choiceEl.innerHTML = html;

        // Add click handler
        choiceEl.onclick = () => handleEventChoice(choice.id, choiceEl);

        eventChoices.appendChild(choiceEl);
    });
}

/**
 * Render save slots in save/load modal
 * @param {string} containerId - Container element ID
 * @param {Array} availableSaves - Array of save data objects
 * @param {boolean} allowEmpty - Whether to show empty slots
 * @param {Function} selectSaveSlot - Function to select a save slot
 */
export function renderSaveSlots(containerId, availableSaves, allowEmpty, selectSaveSlot) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // Create 5 save slots
    for (let i = 1; i <= 5; i++) {
        const slotId = `slot${i}`;
        const saveData = availableSaves.find(s => s.slot_id === slotId);

        const slotEl = document.createElement('div');
        slotEl.className = 'save-slot';
        slotEl.dataset.slotId = slotId;

        if (saveData) {
            slotEl.innerHTML = `
                <div class="save-slot-id">Slot ${i}</div>
                <div class="save-slot-name">${escapeHtml(saveData.name || 'Untitled')}</div>
                <div class="save-slot-info">
                    <div><span>Week:</span> <span>${saveData.week || 1}</span></div>
                    <div><span>Level:</span> <span>${saveData.level || 1}</span></div>
                    <div><span>Date:</span> <span>${formatDate(saveData.saved_at)}</span></div>
                </div>
            `;
        } else {
            slotEl.classList.add('empty');
            slotEl.innerHTML = `
                <div class="save-slot-id">Slot ${i}</div>
                <div class="save-slot-name">Empty Slot</div>
            `;
        }

        // Click handler
        slotEl.onclick = () => selectSaveSlot(slotId, containerId);

        container.appendChild(slotEl);
    }
}

/**
 * Format consequence key to label
 * @param {string} key - Consequence key
 * @returns {string} Formatted label
 */
function formatConsequenceKey(key) {
    const labels = {
        'budget': '💰 Budget',
        'stability': '📊 Stability',
        'unplanned_work': '🔥 Unplanned',
        'morale': '😊 Morale',
        'wip_limit': '📏 WIP Limit',
        'knowledge': '📚 Knowledge'
    };
    return labels[key] || key;
}
