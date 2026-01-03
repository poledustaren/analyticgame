document.addEventListener('DOMContentLoaded', () => {
    // --- API & Constants ---
    const API_BASE_URL = 'http://127.0.0.1:5001/api';

    // --- DOM Elements ---
    const appLayout = document.getElementById('app-layout');
    // Sidebar
    const levelDisplay = document.getElementById('level-display');
    const levelTitle = document.querySelector('.level-title'); // Need to update this text
    const resourcePool = document.getElementById('resource-pool');
    const newGameBtn = document.getElementById('new-game-btn');
    const saveGameBtn = document.getElementById('save-game-btn');
    // Metrics
    const metricBudget = document.getElementById('metric-budget');
    const metricStability = document.getElementById('metric-stability');
    const metricUnplannedBar = document.getElementById('metric-unplanned-bar');
    const metricUnplannedText = document.getElementById('metric-unplanned-text');
    const metricWeek = document.getElementById('metric-week');
    // Board
    const wipCurrent = document.getElementById('wip-current');
    const wipLimit = document.getElementById('wip-limit');
    const wipBadge = document.querySelector('.wip-badge'); // For coloring
    // Panels
    const mentorLog = document.getElementById('mentor-log');
    const chatLog = document.getElementById('chat-log');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    // Sprint Elements
    const sprintNumber = document.getElementById('sprint-number');
    const sprintPhase = document.getElementById('sprint-phase');
    const sprintCapacity = document.getElementById('sprint-capacity');
    const sprintVelocity = document.getElementById('sprint-velocity');
    const openSprintModal = document.getElementById('open-sprint-modal');
    const sprintModal = document.getElementById('sprint-modal');
    const closeSprintModal = document.getElementById('close-sprint-modal');
    const advanceSprintPhase = document.getElementById('advance-sprint-phase');
    const completeSprint = document.getElementById('complete-sprint');

    // --- State Management ---
    let currentState = null;

    // --- Initialization ---
    function init() {
        // Attach Event Listeners
        newGameBtn.onclick = startNewGame;
        saveGameBtn.onclick = handleSaveGame;

        // Sprint Event Listeners
        openSprintModal.onclick = () => sprintModal.style.display = 'flex';
        closeSprintModal.onclick = () => sprintModal.style.display = 'none';
        advanceSprintPhase.onclick = handleAdvanceSprintPhase;
        completeSprint.onclick = handleCompleteSprint;

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            });
        });

        // Drag & Drop Global Handlers
        setupDragAndDrop();

        // Auto-start new game
        startNewGame();
    }

    async function startNewGame() {
        try {
            const response = await fetch(`${API_BASE_URL}/new_game`, { method: 'POST' });
            const state = await response.json();
            render(state);
        } catch (error) {
            console.error("Failed to start game:", error);
        }
    }

    async function sendAction(actionData) {
        try {
            const response = await fetch(`${API_BASE_URL}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actionData),
            });
            const newState = await response.json();
            render(newState);
        } catch (error) {
            console.error("Action failed:", error);
        }
    }

    async function handleSaveGame() {
        alert("Save functionality placeholder.");
    }

    // --- Rendering Logic ---
    function render(state) {
        // Check for Level Change (Transition Animation placeholder)
        if (currentState && currentState.level < state.level) {
            alert(`CONGRATULATIONS! Level ${currentState.level} Complete.\nStarting Level ${state.level}: The First Way (Flow)`);
        }

        currentState = state;

        // 1. Metrics & Level
        levelDisplay.textContent = state.level;
        if (state.level === 1) levelTitle.textContent = "The Stabilizer";
        else if (state.level === 2) levelTitle.textContent = "The First Way (Flow)";

        metricBudget.textContent = `$${state.budget.toLocaleString()}`;
        metricStability.textContent = `${state.stability}%`;
        metricWeek.textContent = state.week;

        // Unplanned Work Bar
        const unplannedPct = state.unplanned_work;
        metricUnplannedBar.style.width = `${unplannedPct}%`;
        metricUnplannedText.textContent = `${unplannedPct}%`;
        if (unplannedPct > 50) metricUnplannedBar.style.backgroundColor = '#ef4444'; // Red
        else if (unplannedPct > 20) metricUnplannedBar.style.backgroundColor = '#f59e0b'; // Orange
        else metricUnplannedBar.style.backgroundColor = '#22c55e'; // Green

        // 2. Resources (Brent)
        renderResources(state.resources);

        // 3. Board
        renderBoard(state.tasks, state.wip_limit);

        // 4. Logs
        renderLogs(state.mentor_log, state.chat_history);

        // 5. Sprint
        renderSprint(state.current_sprint);
    }

    function renderSprint(sprint) {
        if (!sprint) return;

        sprintNumber.textContent = sprint.sprint_number;
        sprintPhase.textContent = sprint.phase.toUpperCase();
        sprintPhase.dataset.phase = sprint.phase;
        sprintPhase.className = `sprint-phase ${sprint.phase}`;

        sprintCapacity.textContent = sprint.capacity;
        sprintVelocity.textContent = sprint.velocity;

        // Update modal title
        document.getElementById('sprint-modal-title').textContent =
            `Sprint ${sprint.sprint_number} - ${sprint.phase.charAt(0).toUpperCase() + sprint.phase.slice(1)}`;

        // Show appropriate phase content
        document.querySelectorAll('.sprint-phase-content').forEach(el => el.style.display = 'none');
        const phaseContent = document.getElementById(`sprint-content-${sprint.phase}`);
        if (phaseContent) phaseContent.style.display = 'block';

        // Show/hide complete button
        completeSprint.style.display = sprint.phase === 'retro' ? 'block' : 'none';

        // Render sprint goals
        const goalsList = document.getElementById('sprint-goals-list');
        if (goalsList) {
            goalsList.innerHTML = sprint.sprint_goals.map(g =>
                `<div class="sprint-list-item">${g}</div>`
            ).join('');
        }

        // Render retro actions
        const retroActionsList = document.getElementById('retro-actions-list');
        if (retroActionsList) {
            retroActionsList.innerHTML = sprint.retro_actions.map(a =>
                `<div class="sprint-list-item">${a}</div>`
            ).join('');
        }

        // Render sprint backlog tasks
        renderSprintBacklog(sprint);
    }

    function renderSprintBacklog(sprint) {
        const backlogContainer = document.getElementById('sprint-backlog-tasks');
        const activeContainer = document.getElementById('active-sprint-tasks');
        const reviewContainer = document.getElementById('review-tasks');
        const availableContainer = document.getElementById('available-tasks');

        if (!currentState) return;

        // Available tasks (not in sprint)
        if (availableContainer) {
            const allTasks = [...currentState.tasks.backlog, ...currentState.tasks.in_progress];
            const availableTasks = allTasks.filter(t => !sprint.sprint_backlog.includes(t.id));

            availableContainer.innerHTML = availableTasks.map(task =>
                `<div class="sprint-backlog-item" onclick="addToSprint('${task.id}')">
                    <span class="task-title">${task.title}</span>
                    <span class="task-points">${task.points} pts</span>
                </div>`
            ).join('');
        }

        // Sprint backlog tasks
        const sprintTasks = sprint.sprint_backlog.map(taskId => {
            for (const col of Object.values(currentState.tasks)) {
                const task = col.find(t => t.id === taskId);
                if (task) return task;
            }
            return null;
        }).filter(Boolean);

        const renderSprintTasks = (container, tasks) => {
            if (!container) return;
            container.innerHTML = tasks.map(task =>
                `<div class="sprint-backlog-item">
                    <span class="task-title">${task.title}</span>
                    <span class="task-points">${task.points} pts</span>
                </div>`
            ).join('');
        };

        renderSprintTasks(backlogContainer, sprintTasks);
        renderSprintTasks(activeContainer, sprintTasks);
        renderSprintTasks(reviewContainer, sprintTasks);
    }

    async function handleAdvanceSprintPhase() {
        await sendAction({ type: 'sprint_advance_phase' });
    }

    async function handleCompleteSprint() {
        await sendAction({ type: 'sprint_complete' });
    }

    // Global function for onclick in HTML
    window.addToSprint = async function(taskId) {
        await sendAction({ type: 'sprint_add_task', task_id: taskId });
    };

    window.removeFromSprint = async function(taskId) {
        await fetch(`${API_BASE_URL}/sprint/task`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId })
        });
        const newState = await fetch(`${API_BASE_URL}/state`).then(r => r.json());
        render(newState);
    };

    function renderResources(resources) {
        resourcePool.innerHTML = '';
        resources.forEach(res => {
            if (!res.busy_task_id) {
                const avatar = createAvatarElement(res);
                resourcePool.appendChild(avatar);
            }
        });
    }

    function createAvatarElement(res) {
        const div = document.createElement('div');
        div.className = 'resource-avatar';
        div.draggable = true;
        div.textContent = res.name[0];
        div.dataset.resourceId = res.id;
        div.title = `${res.name} (${res.role})`;
        return div;
    }

    function renderBoard(tasks, limit) {
        wipLimit.textContent = limit;
        wipCurrent.textContent = tasks.in_progress.length;

        // Highlight WIP violation or fullness
        if (tasks.in_progress.length >= limit) {
            wipBadge.style.backgroundColor = '#ef4444'; // Red warning
            wipBadge.style.color = 'white';
        } else {
            wipBadge.style.backgroundColor = '#334155'; // Default
            wipBadge.style.color = '#94a3b8';
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

                card.innerHTML = `
                    <h4>${task.title}</h4>
                    <p style="font-size:11px; color:#ccc;">${task.description || ''}</p>
                    <div class="task-meta">
                        <span>${task.points} pts</span>
                        ${resourceSlotHtml}
                    </div>
                `;

                if (isResourceNeeded && !assignedResId) {
                    card.classList.add('resource-drop-target');
                }

                colList.appendChild(card);
            });
        }
    }

    function renderLogs(mentorMessages, teamMessages) {
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

    // --- Drag & Drop Logic ---
    let draggedElement = null;
    let dragType = null;

    function setupDragAndDrop() {
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

        document.addEventListener('dragend', e => {
            if (e.target) e.target.style.opacity = '1';
            draggedElement = null;
            dragType = null;
            document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
            document.querySelectorAll('.task-card').forEach(c => c.style.borderStyle = '');
        });

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

                    // Optimization: Don't send request if dropping in same column
                    if (newColId !== oldColId) {
                        sendAction({
                            type: 'task_move',
                            task_id: taskId,
                            new_column_id: newColId,
                            old_column_id: oldColId
                        });
                    }
                }
            });
        });

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
                const resourceId = draggedElement.dataset.resourceId;
                const taskId = card.dataset.taskId;

                sendAction({
                    type: 'assign_resource',
                    resource_id: resourceId,
                    task_id: taskId
                });
            }
        });
    }

    init();
});
