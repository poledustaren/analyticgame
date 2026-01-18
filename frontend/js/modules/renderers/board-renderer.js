/**
 * Board Renderer Module
 *
 * Handles rendering of the Kanban board and task cards.
 */

/**
 * Render tasks to the board
 * @param {Object} tasks - Tasks object with arrays for each column
 * @param {number} limit - WIP limit
 * @param {Object} currentState - Current game state
 * @param {Function} openPlanningPoker - Function to open planning poker modal
 */
export function renderBoard(tasks, limit, currentState, openPlanningPoker) {
    const wipLimit = document.getElementById('wip-limit');
    const wipCurrent = document.getElementById('wip-current');
    const wipBadge = document.querySelector('.wip-badge');

    wipLimit.textContent = limit;
    wipCurrent.textContent = tasks.in_progress.length;

    // Highlight WIP violation or fullness with animations
    if (tasks.in_progress.length > limit) {
        wipBadge.style.backgroundColor = '#ef4444'; // Red warning
        wipBadge.style.color = 'white';
        wipBadge.classList.add('critical');
    } else if (tasks.in_progress.length >= limit) {
        wipBadge.style.backgroundColor = '#f59e0b'; // Orange warning
        wipBadge.style.color = 'white';
        wipBadge.classList.add('warning');
        wipBadge.classList.remove('critical');
    } else {
        wipBadge.style.backgroundColor = '#334155'; // Default
        wipBadge.style.color = '#94a3b8';
        wipBadge.classList.remove('warning', 'critical');
    }

    // Clear columns
    ['backlog', 'in_progress', 'review', 'done'].forEach(colId => {
        const colList = document.querySelector(`#${colId} .task-list`);
        const countSpan = document.querySelector(`#${colId} .count`);
        if (colList) colList.innerHTML = '';
        if (countSpan) countSpan.textContent = tasks[colId] ? tasks[colId].length : 0;
    });

    // Render Tasks
    for (const [colId, taskList] of Object.entries(tasks)) {
        const colList = document.querySelector(`#${colId} .task-list`);
        if (!colList) continue;

        taskList.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card type-${task.type}`;
            card.draggable = true;
            card.dataset.taskId = task.id;
            card.dataset.colId = colId;

            const isResourceNeeded = !!task.required_resource;
            const assignedResId = task.assigned_resource;

            let resourceSlotHtml = '';
            if (isResourceNeeded) {
                if (assignedResId) {
                    const resName = currentState.resources.find(r => r.id === assignedResId)?.name || '?';
                    resourceSlotHtml = `<div class="resource-slot-mini filled" title="Assigned: ${resName}">
                        <div class="resource-avatar" style="width:24px; height:24px; font-size:10px;">${resName[0]}</div>
                    </div>`;
                } else {
                    resourceSlotHtml = `<div class="resource-slot-mini" title="Drag Brent Here"></div>
                    <div class="needed-badge">NEEDS BRENT</div>`;
                }
            }

            // Check if task is in current sprint
            const isInSprint = currentState?.current_sprint?.task_ids?.includes(task.id);
            const sprintBadge = isInSprint ? '<span class="sprint-task-badge">SPRINT</span>' : '';

            card.innerHTML = `
                ${sprintBadge}
                <h4>${task.title}</h4>
                <p style="font-size:11px; color:#ccc;">${task.description || ''}</p>
                <div class="task-meta">
                    <span>${task.points} pts</span>
                    ${resourceSlotHtml}
                </div>
                <button class="task-poker-btn" data-task-id="${task.id}">Re-estimate</button>
            `;

            if (isResourceNeeded && !assignedResId) {
                card.classList.add('resource-drop-target');
            }

            // Add Planning Poker button handler
            const pokerBtn = card.querySelector('.task-poker-btn');
            if (pokerBtn && openPlanningPoker) {
                pokerBtn.onclick = (e) => {
                    e.stopPropagation(); // Prevent drag start
                    openPlanningPoker(task);
                };
            }

            colList.appendChild(card);
        });
    }
}

/**
 * Create an avatar element for a resource
 * @param {Object} res - Resource object
 * @returns {HTMLElement} Avatar element
 */
export function createAvatarElement(res) {
    const div = document.createElement('div');
    div.className = 'resource-avatar';
    div.draggable = true;
    div.textContent = res.name[0];
    div.dataset.resourceId = res.id;
    div.title = `${res.name} (${res.role})`;
    return div;
}
