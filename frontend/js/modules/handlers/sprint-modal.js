/**
 * Sprint Modal Handler
 *
 * Manages Sprint Planning modal including:
 * - Opening sprint planning
 * - Adding/removing tasks to sprint backlog
 * - Creating new sprints
 */

import { sendAction } from '../api.js';
import { SoundSystem } from '../ui.js';
import Toast from '../toast.js';

// ============================================
// STATE
// ============================================

let planningSprintTasks = [];

// ============================================
// PUBLIC FUNCTIONS
// ============================================

/**
 * Open Sprint Planning modal
 */
export function openPlanningModal() {
    const planningModal = document.getElementById('planning-modal');
    const sprintGoalInput = document.getElementById('sprint-goal-input');
    const sprintDuration = document.getElementById('sprint-duration');

    SoundSystem.play('modalOpen');

    // Clear previous inputs
    if (sprintGoalInput) sprintGoalInput.value = '';
    if (sprintDuration) sprintDuration.value = '2';
    planningSprintTasks = [];

    // Populate available tasks from backlog
    renderPlanningTasks();

    if (planningModal) planningModal.style.display = 'flex';
}

/**
 * Close Sprint Planning modal
 */
export function closePlanningModal() {
    SoundSystem.play('modalClose');
    const planningModal = document.getElementById('planning-modal');
    if (planningModal) planningModal.style.display = 'none';
}

/**
 * Create sprint from planning modal
 */
export async function createSprint() {
    const sprintGoalInput = document.getElementById('sprint-goal-input');
    const sprintDuration = document.getElementById('sprint-duration');

    const goal = sprintGoalInput?.value.trim() || '';
    const duration = parseInt(sprintDuration?.value) || 2;

    SoundSystem.play('success');
    Toast.success('Sprint Created', `"${goal || 'No goal'}" - ${duration} weeks`, 2500);

    await sendAction({
        type: 'sprint_create',
        goal: goal,
        duration_weeks: duration
    });

    // Add selected tasks to sprint
    for (const taskId of planningSprintTasks) {
        await sendAction({ type: 'sprint_add_task', task_id: taskId });
    }

    closePlanningModal();
}

/**
 * Setup Sprint Planning modal handlers
 */
export function setupSprintModalHandlers() {
    const planningClose = document.getElementById('planning-close');
    const planningCancel = document.getElementById('planning-cancel');
    const planningConfirm = document.getElementById('planning-confirm');

    if (planningClose) planningClose.onclick = closePlanningModal;
    if (planningCancel) planningCancel.onclick = closePlanningModal;
    if (planningConfirm) planningConfirm.onclick = createSprint;
}

// ============================================
// PRIVATE FUNCTIONS
// ============================================

/**
 * Render planning tasks
 */
function renderPlanningTasks() {
    const planningBacklog = document.getElementById('planning-backlog');
    if (!planningBacklog) return;

    // Get current state (would need to be imported or passed in)
    // For now, this is a placeholder
    const backlogTasks = [];
    const sprintTaskIds = [];

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
 * Render sprint backlog
 */
function renderSprintBacklog() {
    const planningSprintBacklog = document.getElementById('planning-sprint-backlog');
    const sprintVelocityPreview = document.getElementById('sprint-velocity-preview');
    if (!planningSprintBacklog) return;

    const sprintTaskIds = planningSprintTasks;
    const allTasks = [];

    const sprintTasks = allTasks.filter(t => sprintTaskIds.includes(t.id));

    // Calculate total points
    const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    if (sprintVelocityPreview) sprintVelocityPreview.textContent = `${totalPoints} pts`;

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
 * Add task to sprint backlog
 * @param {string} taskId - Task ID
 */
function addToSprintBacklog(taskId) {
    planningSprintTasks.push(taskId);
    renderSprintBacklog();
    // Remove from available
    const planningBacklog = document.getElementById('planning-backlog');
    const item = planningBacklog?.querySelector(`[data-task-id="${taskId}"]`);
    if (item) item.remove();
}

/**
 * Remove task from sprint backlog
 * @param {string} taskId - Task ID
 */
function removeFromSprintBacklog(taskId) {
    planningSprintTasks = planningSprintTasks.filter(id => id !== taskId);
    renderSprintBacklog();
}
