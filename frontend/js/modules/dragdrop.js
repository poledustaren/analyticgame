/**
 * Drag & Drop Module
 * Handles task card dragging and resource assignment via drag and drop
 */

// Module state
let draggedElement = null;
let dragType = null;

// Dependencies (injected during initialization)
let currentState = null;
let sendAction = null;
let SoundSystem = null;
let Toast = null;
let showToast = null;

/**
 * Initialize the drag & drop module with dependencies
 * @param {Object} dependencies - Required dependencies
 */
export function initDragDrop(dependencies) {
    ({
        currentState,
        sendAction,
        SoundSystem,
        Toast,
        showToast
    } = dependencies);
}

/**
 * Set up task drag and drop handlers
 * Handles dragging task cards between kanban columns
 */
export function setupTaskDragDrop() {
    // Columns are drop targets for TASKS
    document.querySelectorAll('.kanban-column').forEach(col => {
        col.addEventListener('dragover', e => {
            if (dragType === 'task') {
                e.preventDefault();
                col.classList.add('drag-over');
            }
        });

        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));

        col.addEventListener('drop', e => {
            if (dragType === 'task') {
                e.preventDefault();
                col.classList.remove('drag-over');

                const newColId = col.dataset.columnId;
                const taskId = draggedElement.dataset.taskId;
                const oldColId = draggedElement.dataset.colId;

                handleTaskDrop(newColId, taskId, oldColId);
            }
        });
    });
}

/**
 * Handle dropping a task card onto a column
 * @param {string} newColId - Target column ID
 * @param {string} taskId - Task ID being moved
 * @param {string} oldColId - Source column ID
 */
function handleTaskDrop(newColId, taskId, oldColId) {
    // WIP Limit check for in_progress column
    if (newColId === 'in_progress' && currentState) {
        const currentWip = currentState.tasks?.in_progress?.length || 0;
        const wipLimit = currentState.wip_limit || 3;
        if (currentWip >= wipLimit) {
            showToast('WIP Limit Reached!', `Maximum ${wipLimit} tasks allowed in progress.`, 'warning', 4000);
            return;
        }
    }

    // Sprint validation: cannot move non-sprint task to in_progress during active sprint
    if (newColId === 'in_progress' && currentState?.current_sprint) {
        const sprintPhase = currentState.current_sprint.phase;
        const sprintTaskIds = currentState.current_sprint.task_ids || [];

        // Only block during ACTIVE phase, not PLANNING
        if (sprintPhase === 'active' && !sprintTaskIds.includes(taskId)) {
            SoundSystem.play('error');
            Toast.error('Sprint in Progress', 'Only sprint tasks can be moved to In Progress during active sprint!', 4000);
            return;
        }
    }

    // Warning when moving task from done back
    if (oldColId === 'done' && newColId !== 'done') {
        SoundSystem.play('wipWarning');
        Toast.warning('Moving from Done', 'Task is being moved back from Done. Is this a hotfix?', 3000);
    }

    // Optimization: Don't send request if dropping in same column
    if (newColId !== oldColId) {
        SoundSystem.play('taskMove');

        // Play different sound for completing tasks
        if (newColId === 'done') {
            SoundSystem.play('taskComplete');
        }

        sendAction({
            type: 'task_move',
            task_id: taskId,
            new_column_id: newColId,
            old_column_id: oldColId
        });
    }
}

/**
 * Set up resource drag and drop handlers
 * Handles dragging resources (avatars) onto task cards
 */
export function setupResourceDragDrop() {
    // Task Cards are drop targets for RESOURCES
    document.addEventListener('dragover', e => {
        const card = e.target.closest('.task-card');
        if (dragType === 'resource' && card && card.classList.contains('resource-drop-target')) {
            e.preventDefault();
            card.style.border = '2px dashed #eab308';
        }
    });

    document.addEventListener('dragleave', e => {
        const card = e.target.closest('.task-card');
        if (card) card.style.border = '';
    });

    document.addEventListener('drop', e => {
        const card = e.target.closest('.task-card');
        if (dragType === 'resource' && card && card.classList.contains('resource-drop-target')) {
            e.preventDefault();
            handleResourceDrop(card);
        }
    });
}

/**
 * Handle dropping a resource onto a task card
 * @param {HTMLElement} card - Target task card element
 */
function handleResourceDrop(card) {
    const resourceId = draggedElement.dataset.resourceId;
    const taskId = card.dataset.taskId;

    SoundSystem.play('resourceAssign');

    sendAction({
        type: 'assign_resource',
        resource_id: resourceId,
        task_id: taskId
    });
}

/**
 * Set up global drag start and end handlers
 * Initializes dragging for both tasks and resources
 */
export function setupDragDrop() {
    // Global dragstart handler
    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('task-card')) {
            draggedElement = e.target;
            dragType = 'task';
            e.target.style.opacity = '0.5';
        } else if (e.target.classList.contains('resource-avatar')) {
            draggedElement = e.target;
            dragType = 'resource';
            e.target.style.opacity = '0.5';
        }
    });

    // Global dragend handler
    document.addEventListener('dragend', e => {
        if (e.target) e.target.style.opacity = '1';
        draggedElement = null;
        dragType = null;
        document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
        document.querySelectorAll('.task-card').forEach(c => c.style.borderStyle = '');
    });

    // Setup task and resource drop handlers
    setupTaskDragDrop();
    setupResourceDragDrop();
}
