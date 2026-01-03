document.addEventListener('DOMContentLoaded', () => {
    // --- API & Constants ---
    const API_BASE_URL = 'http://127.0.0.1:5001/api';

    // --- DOM Elements ---
    const appLayout = document.getElementById('app-layout');
    // Sidebar
    const levelDisplay = document.getElementById('level-display');
    const levelTitle = document.querySelector('.level-title');
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
    const wipBadge = document.querySelector('.wip-badge');
    // Panels
    const mentorLog = document.getElementById('mentor-log');
    const chatLog = document.getElementById('chat-log');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    // Sprint Elements
    const sprintNumber = document.getElementById('sprint-number');
    const sprintPhaseDisplay = document.getElementById('sprint-phase-display');
    const capacityInput = document.getElementById('capacity-input');
    const setCapacityBtn = document.getElementById('set-capacity-btn');
    const sprintGoalsList = document.getElementById('sprint-goals-list');
    const goalInput = document.getElementById('goal-input');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const sprintTasksList = document.getElementById('sprint-tasks-list');
    const sprintPoints = document.getElementById('sprint-points');
    const sprintCapacity = document.getElementById('sprint-capacity');
    const sprintCapacityPanel = document.getElementById('sprint-capacity-panel');
    const sprintGoalsPanel = document.getElementById('sprint-goals-panel');
    const sprintBacklogPanel = document.getElementById('sprint-backlog-panel');
    const sprintVelocityPanel = document.getElementById('sprint-velocity-panel');
    const sprintVelocity = document.getElementById('sprint-velocity');
    const velocityProgress = document.getElementById('velocity-progress');
    const sprintRetroPanel = document.getElementById('sprint-retro-panel');
    const retroActionsList = document.getElementById('retro-actions-list');
    const retroInput = document.getElementById('retro-input');
    const addRetroBtn = document.getElementById('add-retro-btn');
    const advancePhaseBtn = document.getElementById('advance-phase-btn');
    const completeSprintBtn = document.getElementById('complete-sprint-btn');

    // --- State Management ---
    let currentState = null;

    // --- Initialization ---
    function init() {
        // Attach Event Listeners
        newGameBtn.onclick = startNewGame;
        saveGameBtn.onclick = handleSaveGame;

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            });
        });

        // Sprint Event Listeners
        setCapacityBtn.onclick = () => setSprintCapacity(parseInt(capacityInput.value));
        addGoalBtn.onclick = () => addSprintGoal(goalInput.value);
        addRetroBtn.onclick = () => addRetroAction(retroInput.value);
        advancePhaseBtn.onclick = advanceSprintPhase;
        completeSprintBtn.onclick = completeSprint;

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

    // --- Sprint Functions ---

    async function setSprintCapacity(capacity) {
        await sendAction({ type: 'sprint_set_capacity', capacity });
    }

    async function addSprintGoal(goal) {
        if (!goal.trim()) return;
        await sendAction({ type: 'sprint_add_goal', goal });
        goalInput.value = '';
    }

    async function addTaskToSprint(taskId) {
        await sendAction({ type: 'sprint_add_task', task_id: taskId });
    }

    async function removeTaskFromSprint(taskId) {
        await sendAction({ type: 'sprint_remove_task', task_id: taskId });
    }

    async function advanceSprintPhase() {
        await sendAction({ type: 'sprint_advance_phase' });
    }

    async function completeSprint() {
        await sendAction({ type: 'sprint_complete' });
    }

    async function addRetroAction(action) {
        if (!action.trim()) return;
        await sendAction({ type: 'sprint_add_retro_action', action });
        retroInput.value = '';
    }

    function removeGoal(index) {
        const sprint = currentState.current_sprint;
        if (sprint && sprint.sprint_goals[index]) {
            sprint.sprint_goals.splice(index, 1);
            renderSprint(sprint);
        }
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
        if (unplannedPct > 50) metricUnplannedBar.style.backgroundColor = '#ef4444';
        else if (unplannedPct > 20) metricUnplannedBar.style.backgroundColor = '#f59e0b';
        else metricUnplannedBar.style.backgroundColor = '#22c55e';

        // 2. Resources (Brent)
        renderResources(state.resources);

        // 3. Board
        renderBoard(state.tasks, state.wip_limit);

        // 4. Logs
        renderLogs(state.mentor_log, state.chat_history);

        // 5. Sprint
        if (state.current_sprint) {
            renderSprint(state.current_sprint);
        }
    }

    function renderSprint(sprint) {
        if (!sprint) return;

        // Sprint number
        sprintNumber.textContent = sprint.sprint_number;

        // Phase indicators
        const phases = ['planning', 'active', 'review', 'retro'];
        const phaseNames = ['PLANNING', 'ACTIVE', 'REVIEW', 'RETRO'];
        const currentPhaseIndex = phases.indexOf(sprint.phase);

        phases.forEach((phase, index) => {
            const el = document.getElementById(`phase-${phase}`);
            el.classList.remove('active', 'completed');
            if (index === currentPhaseIndex) {
                el.classList.add('active');
            } else if (index < currentPhaseIndex) {
                el.classList.add('completed');
            }
        });

        // Panel visibility based on phase
        const isPlanning = sprint.phase === 'planning';
        const isActive = sprint.phase === 'active';
        const isReview = sprint.phase === 'review';
        const isRetro = sprint.phase === 'retro';

        sprintCapacityPanel.style.display = isPlanning ? 'block' : 'none';
        sprintGoalsPanel.style.display = isPlanning ? 'block' : 'none';
        sprintBacklogPanel.style.display = (isPlanning || isActive) ? 'block' : 'none';
        sprintVelocityPanel.style.display = (isActive || isReview || isRetro) ? 'block' : 'none';
        sprintRetroPanel.style.display = isRetro ? 'block' : 'none';

        // Capacity
        capacityInput.value = sprint.capacity;
        sprintCapacity.textContent = sprint.capacity;

        // Goals
        sprintGoalsList.innerHTML = sprint.sprint_goals.map((goal, i) => `
            <div class="sprint-list-item">
                <span>${goal}</span>
                <button class="remove-btn" onclick="event.target.closest('.sprint-list-item').remove()">×</button>
            </div>
        `).join('');

        // Calculate sprint points
        let sprintTotalPoints = 0;
        if (currentState && currentState.tasks) {
            sprint.sprint_backlog.forEach(taskId => {
                for (const col of Object.values(currentState.tasks)) {
                    const task = col.find(t => t.id === taskId);
                    if (task) {
                        sprintTotalPoints += task.points || 0;
                        break;
                    }
                }
            });
        }
        sprintPoints.textContent = sprintTotalPoints;

        // Sprint tasks list
        const sprintTasksHtml = sprint.sprint_backlog.map(taskId => {
            let task = null;
            if (currentState && currentState.tasks) {
                for (const col of Object.values(currentState.tasks)) {
                    const found = col.find(t => t.id === taskId);
                    if (found) { task = found; break; }
                }
            }
            if (!task) return '';
            return `
                <div class="sprint-task-item">
                    <span class="task-points">${task.points}pts</span>
                    <span class="task-title">${task.title}</span>
                    <button class="remove-task-btn" onclick="window.removeSprintTask('${taskId}')">×</button>
                </div>
            `;
        }).join('');
        sprintTasksList.innerHTML = sprintTasksHtml;

        // Velocity
        sprintVelocity.textContent = sprint.velocity;
        const velocityPercent = sprint.capacity > 0 ? Math.min((sprint.velocity / sprint.capacity) * 100, 100) : 0;
        velocityProgress.style.width = `${velocityPercent}%`;

        // Retro actions
        retroActionsList.innerHTML = sprint.retro_actions.map((action, i) => `
            <div class="sprint-list-item">
                <span>${action}</span>
                <button class="remove-btn" onclick="event.target.closest('.sprint-list-item').remove()">×</button>
            </div>
        `).join('');

        // Advance phase button text
        const phaseLabels = {
            'planning': 'START SPRINT →',
            'active': 'TO REVIEW →',
            'review': 'TO RETRO →',
            'retro': null  // Will show complete button instead
        };
        if (phaseLabels[sprint.phase]) {
            advancePhaseBtn.textContent = phaseLabels[sprint.phase];
            advancePhaseBtn.style.display = 'block';
            completeSprintBtn.style.display = 'none';
        } else {
            advancePhaseBtn.style.display = 'none';
            completeSprintBtn.style.display = 'block';
        }
    }

    // Global function for remove button
    window.removeSprintTask = async function(taskId) {
        await removeTaskFromSprint(taskId);
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

        // Check if in planning phase
        const isPlanningPhase = currentState?.current_sprint?.phase === 'planning';
        const sprintBacklog = currentState?.current_sprint?.sprint_backlog || [];

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
                const isInSprint = sprintBacklog.includes(task.id);

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

                let addToSprintBtn = '';
                if (isPlanningPhase && colId === 'backlog') {
                    const btnText = isInSprint ? '✓ IN SPRINT' : '+ ADD TO SPRINT';
                    const btnClass = isInSprint ? 'add-to-sprint-btn in-sprint' : 'add-to-sprint-btn';
                    addToSprintBtn = `<button class="${btnClass}" data-task-id="${task.id}">${btnText}</button>`;
                }

                card.innerHTML = `
                    <h4>${task.title}</h4>
                    <p style="font-size:11px; color:#ccc;">${task.description || ''}</p>
                    <div class="task-meta">
                        <span>${task.points} pts</span>
                        ${resourceSlotHtml}
                    </div>
                    ${addToSprintBtn}
                `;

                if (isResourceNeeded && !assignedResId) {
                    card.classList.add('resource-drop-target');
                }

                colList.appendChild(card);
            });
        }

        // Attach click handlers to Add to Sprint buttons
        document.querySelectorAll('.add-to-sprint-btn:not(.in-sprint)').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                addTaskToSprint(btn.dataset.taskId);
            };
        });
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
