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
    const debugMinigamesBtn = document.getElementById('debug-minigames-btn');
    // Sprint Elements
    const sprintStatus = document.getElementById('sprint-status');
    const sprintBtn = document.getElementById('sprint-btn');
    const sprintPhasesBar = document.getElementById('sprint-phases-bar');
    const sprintGoalText = document.getElementById('sprint-goal-text');
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
    // Velocity
    const velocityChart = document.getElementById('velocity-chart');
    // Modals
    const planningModal = document.getElementById('planning-modal');
    const planningClose = document.getElementById('planning-close');
    const planningCancel = document.getElementById('planning-cancel');
    const planningConfirm = document.getElementById('planning-confirm');
    const sprintGoalInput = document.getElementById('sprint-goal-input');
    const sprintDuration = document.getElementById('sprint-duration');
    const planningBacklog = document.getElementById('planning-backlog');
    const planningSprintBacklog = document.getElementById('planning-sprint-backlog');
    const sprintVelocityPreview = document.getElementById('sprint-velocity-preview');
    const reviewModal = document.getElementById('review-modal');
    const reviewToRetroBtn = document.getElementById('review-to-retro');
    const retroModal = document.getElementById('retro-modal');
    const retroCompleteBtn = document.getElementById('retro-complete');

    // --- State Management ---
    let currentState = null;
    let planningSprintTasks = []; // Tasks selected during planning

    // --- Initialization ---
    function init() {
        // Attach Event Listeners
        newGameBtn.onclick = startNewGame;
        saveGameBtn.onclick = handleSaveGame;
        debugMinigamesBtn.onclick = showDebugMinigameMenu;

        // Sprint Event Listeners
        sprintBtn.onclick = handleSprintButtonClick;

        // Modal Event Listeners
        planningClose.onclick = closePlanningModal;
        planningCancel.onclick = closePlanningModal;
        planningConfirm.onclick = createSprint;
        reviewToRetroBtn.onclick = goToRetro;
        retroCompleteBtn.onclick = completeRetro;

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

    async function showDebugMinigameMenu() {
        const minigameType = prompt("Выберите минигейм для тестирования:\n1 - brent_rescue\n2 - flow_optimization\n3 - firefighting", "1");
        const minigames = {
            '1': 'brent_rescue',
            '2': 'flow_optimization',
            '3': 'firefighting',
            'brent_rescue': 'brent_rescue',
            'flow_optimization': 'flow_optimization',
            'firefighting': 'firefighting'
        };

        const selected = minigames[minigameType];
        if (selected) {
            try {
                const response = await fetch(`${API_BASE_URL}/debug/start_minigame`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ minigame_type: selected })
                });
                const state = await response.json();
                render(state);
            } catch (error) {
                console.error("Failed to start minigame:", error);
            }
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
        if (unplannedPct > 50) metricUnplannedBar.style.backgroundColor = '#ef4444'; // Red
        else if (unplannedPct > 20) metricUnplannedBar.style.backgroundColor = '#f59e0b'; // Orange
        else metricUnplannedBar.style.backgroundColor = '#22c55e'; // Green

        // 2. Sprint UI
        renderSprint(state);

        // 3. Resources (Brent)
        renderResources(state.resources);

        // 4. Board
        renderBoard(state.tasks, state.wip_limit);

        // 5. Logs
        renderLogs(state.mentor_log, state.chat_history);

        // 6. Velocity Chart
        renderVelocity(state.velocity_history || []);
    }

    // --- Sprint Rendering ---
    function renderSprint(state) {
        const sprint = state.current_sprint;

        if (!sprint) {
            // No active sprint
            sprintStatus.innerHTML = '<p class="no-sprint">No active sprint</p>';
            sprintBtn.textContent = 'Start Sprint';
            sprintBtn.className = 'sprint-btn';
            sprintPhasesBar.style.display = 'none';
            sprintGoalText.textContent = '-';
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
        } else if (sprint.phase === 'active') {
            sprintBtn.textContent = 'End Sprint';
            sprintBtn.className = 'sprint-btn secondary';
        } else if (sprint.phase === 'review') {
            // Review modal should be open
            showReviewModal(sprint, state);
        } else if (sprint.phase === 'retro') {
            // Retro modal should be open
            sprintBtn.textContent = 'In Retro';
            sprintBtn.className = 'sprint-btn secondary';
        }
    }

    function renderVelocity(velocityHistory) {
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

    // --- Sprint Action Handlers ---

    function handleSprintButtonClick() {
        if (!currentState) return;

        if (!currentState.current_sprint) {
            // Open Planning Modal to create new sprint
            openPlanningModal();
        } else if (currentState.current_sprint.phase === 'planning') {
            // Launch the sprint
            sendAction({ type: 'sprint_start' });
        } else if (currentState.current_sprint.phase === 'active') {
            // End sprint - go to review
            sendAction({ type: 'sprint_end' });
        }
    }

    function openPlanningModal() {
        if (!currentState) return;

        // Clear previous inputs
        sprintGoalInput.value = '';
        sprintDuration.value = '2';
        planningSprintTasks = [];

        // Populate available tasks from backlog
        renderPlanningTasks();

        planningModal.style.display = 'flex';
    }

    function closePlanningModal() {
        planningModal.style.display = 'none';
    }

    function renderPlanningTasks() {
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

    function renderSprintBacklog() {
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

    function addToSprintBacklog(taskId) {
        if (currentState?.current_sprint) {
            sendAction({ type: 'sprint_add_task', task_id: taskId });
        } else {
            planningSprintTasks.push(taskId);
            renderSprintBacklog();
            // Remove from available
            const item = planningBacklog.querySelector(`[data-task-id="${taskId}"]`);
            if (item) item.remove();
        }
    }

    function removeFromSprintBacklog(taskId) {
        if (currentState?.current_sprint) {
            sendAction({ type: 'sprint_remove_task', task_id: taskId });
        } else {
            planningSprintTasks = planningSprintTasks.filter(id => id !== taskId);
            renderSprintBacklog();
        }
    }

    async function createSprint() {
        const goal = sprintGoalInput.value.trim();
        const duration = parseInt(sprintDuration.value);

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

    function showReviewModal(sprint, state) {
        if (reviewModal.style.display === 'flex') return; // Already open

        const planned = sprint.planned_velocity || 0;
        const actual = sprint.actual_velocity || 0;
        const velocity = planned > 0 ? Math.round((actual / planned) * 100) : 0;

        document.getElementById('review-planned').textContent = planned;
        document.getElementById('review-completed').textContent = actual;
        document.getElementById('review-velocity').textContent = `${velocity}%`;

        // Show task completion status
        const reviewTasks = document.getElementById('review-tasks');
        const sprintTaskIds = sprint.task_ids || [];

        const allTasks = [
            ...(state.tasks.backlog || []),
            ...(state.tasks.in_progress || []),
            ...(state.tasks.review || []),
            ...(state.tasks.done || [])
        ];

        const sprintTasks = allTasks.filter(t => sprintTaskIds.includes(t.id));

        reviewTasks.innerHTML = sprintTasks.map(task => {
            const isCompleted = state.tasks.done.some(t => t.id === task.id);
            return `
                <div class="review-task-item ${isCompleted ? 'completed' : 'not-completed'}">
                    <span>${task.title}</span>
                    <span>${task.points} pts ${isCompleted ? '✓' : '✗'}</span>
                </div>
            `;
        }).join('');

        reviewModal.style.display = 'flex';
    }

    function goToRetro() {
        reviewModal.style.display = 'none';
        retroModal.style.display = 'flex';
    }

    async function completeRetro() {
        const wentWell = document.getElementById('retro-went-well').value.trim();
        const issues = document.getElementById('retro-issues').value.trim();
        const actions = document.getElementById('retro-actions').value.trim();

        const notes = [wentWell, issues, actions].filter(n => n).join(' | ');

        // Clear retro inputs
        document.getElementById('retro-went-well').value = '';
        document.getElementById('retro-issues').value = '';
        document.getElementById('retro-actions').value = '';

        retroModal.style.display = 'none';

        await sendAction({
            type: 'sprint_complete_retro',
            notes: notes
        });
    }

    // --- MINIGAME SYSTEM ---

    // Minigame modals
    const brentRescueModal = document.getElementById('brent-rescue-modal');
    const brentRescueClose = document.getElementById('brent-rescue-close');
    const brentRescueSkip = document.getElementById('brent-rescue-skip');
    const brentRescueSubmit = document.getElementById('brent-rescue-submit');
    const knowledgeItemsContainer = document.getElementById('knowledge-items');
    const developerSlotsContainer = document.getElementById('developer-slots');
    const brentRescueTimer = document.getElementById('brent-rescue-timer');

    const flowOptimizationModal = document.getElementById('flow-optimization-modal');
    const flowOptimizationClose = document.getElementById('flow-optimization-close');
    const flowOptimizationSkip = document.getElementById('flow-optimization-skip');
    const flowOptimizationSubmit = document.getElementById('flow-optimization-submit');
    const flowStageSliders = document.getElementById('flow-stage-sliders');

    const firefightingModal = document.getElementById('firefighting-modal');
    const firefightingClose = document.getElementById('firefighting-close');
    const firefightingSkip = document.getElementById('firefighting-skip');
    const firefightingSubmit = document.getElementById('firefighting-submit');
    const incidentCardsContainer = document.getElementById('incident-cards');
    const priorityQueueContainer = document.getElementById('priority-queue');

    // Minigame state
    let currentMinigame = null;
    let minigameTimer = null;
    let brentRescueState = {
        knowledgeItems: [],
        developerKnowledge: { dev1: [], dev2: [], dev3: [] }
    };
    let flowOptimizationState = {
        limits: { backlog: 10, in_progress: 3, review: 2, deploy: 2 }
    };
    let firefightingState = {
        incidents: [],
        priorityAssignments: {}
    };

    // Check for active minigame in state
    function checkMinigame(state) {
        if (state.active_minigame && state.active_minigame !== currentMinigame) {
            openMinigame(state.active_minigame, state.minigame_data);
        }
    }

    function openMinigame(minigameType, data) {
        currentMinigame = minigameType;

        if (minigameType === 'brent_rescue') {
            openBrentRescueMinigame(data);
        } else if (minigameType === 'flow_optimization') {
            openFlowOptimizationMinigame(data);
        } else if (minigameType === 'firefighting') {
            openFirefightingMinigame(data);
        }
    }

    function closeMinigame() {
        if (minigameTimer) {
            clearInterval(minigameTimer);
            minigameTimer = null;
        }
        brentRescueModal.style.display = 'none';
        flowOptimizationModal.style.display = 'none';
        firefightingModal.style.display = 'none';
        currentMinigame = null;
    }

    function submitMinigameResult(minigameType, success, score = 0) {
        sendAction({
            type: 'minigame_result',
            minigame_type: minigameType,
            success: success,
            score: score
        });
        closeMinigame();
    }

    // BRENT RESCUE MINIGAME
    function openBrentRescueMinigame(data) {
        brentRescueState = {
            knowledgeItems: [...(data.knowledge_items || [])],
            developerKnowledge: { dev1: [], dev2: [], dev3: [] }
        };

        // Render knowledge items
        knowledgeItemsContainer.innerHTML = brentRescueState.knowledgeItems.map(item => `
            <div class="knowledge-item" draggable="true" data-knowledge-id="${item.id}">
                <span>${item.icon}</span>
                <span>${item.title}</span>
            </div>
        `).join('');

        // Render developer slots
        developerSlotsContainer.innerHTML = `
            <div class="developer-slot" data-dev-id="dev1">
                <div class="developer-slot-header">
                    <div class="developer-avatar">А</div>
                    <span class="developer-name">Алекс</span>
                </div>
                <div class="developer-knowledge" data-dev-knowledge="dev1"></div>
            </div>
            <div class="developer-slot" data-dev-id="dev2">
                <div class="developer-slot-header">
                    <div class="developer-avatar">М</div>
                    <span class="developer-name">Мария</span>
                </div>
                <div class="developer-knowledge" data-dev-knowledge="dev2"></div>
            </div>
            <div class="developer-slot" data-dev-id="dev3">
                <div class="developer-slot-header">
                    <div class="developer-avatar">Д</div>
                    <span class="developer-name">Джон</span>
                </div>
                <div class="developer-knowledge" data-dev-knowledge="dev3"></div>
            </div>
        `;

        // Setup drag and drop for knowledge items
        setupBrentRescueDragDrop();

        // Start timer
        let timeLeft = data.time_limit || 60;
        brentRescueTimer.textContent = `${timeLeft}s`;
        minigameTimer = setInterval(() => {
            timeLeft--;
            brentRescueTimer.textContent = `${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(minigameTimer);
            }
        }, 1000);

        brentRescueModal.style.display = 'flex';
    }

    function setupBrentRescueDragDrop() {
        let draggedKnowledge = null;

        // Knowledge items drag start
        document.querySelectorAll('.knowledge-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedKnowledge = e.target.dataset.knowledgeId;
                e.target.classList.add('dragging');
            });
            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                draggedKnowledge = null;
            });
        });

        // Developer slots drop handling
        document.querySelectorAll('.developer-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');

                if (draggedKnowledge) {
                    const devId = slot.dataset.devId;
                    const knowledgeItem = brentRescueState.knowledgeItems.find(k => k.id === draggedKnowledge);

                    if (knowledgeItem) {
                        // Add to developer's knowledge
                        brentRescueState.developerKnowledge[devId].push(knowledgeItem);

                        // Remove from pool
                        brentRescueState.knowledgeItems = brentRescueState.knowledgeItems.filter(k => k.id !== draggedKnowledge);

                        // Update UI
                        updateBrentRescueUI();
                    }
                }
            });
        });
    }

    function updateBrentRescueUI() {
        // Update knowledge pool
        knowledgeItemsContainer.innerHTML = brentRescueState.knowledgeItems.map(item => `
            <div class="knowledge-item" draggable="true" data-knowledge-id="${item.id}">
                <span>${item.icon}</span>
                <span>${item.title}</span>
            </div>
        `).join('');

        // Re-setup drag for remaining items
        document.querySelectorAll('.knowledge-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                window.draggedKnowledge = e.target.dataset.knowledgeId;
                e.target.classList.add('dragging');
            });
            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                window.draggedKnowledge = null;
            });
        });

        // Update developer knowledge displays
        Object.keys(brentRescueState.developerKnowledge).forEach(devId => {
            const container = document.querySelector(`[data-dev-knowledge="${devId}"]`);
            if (container) {
                container.innerHTML = brentRescueState.developerKnowledge[devId].map(k => `
                    <div class="knowledge-item">
                        <span>${k.icon}</span>
                    </div>
                `).join('');
            }
        });
    }

    // FLOW OPTIMIZATION MINIGAME
    function openFlowOptimizationMinigame(data) {
        const stages = data.stages || [];
        flowOptimizationState.limits = {
            backlog: stages.find(s => s.id === 'backlog')?.optimal_limit || 10,
            in_progress: stages.find(s => s.id === 'in_progress')?.optimal_limit || 3,
            review: stages.find(s => s.id === 'review')?.optimal_limit || 2,
            deploy: stages.find(s => s.id === 'deploy')?.optimal_limit || 2
        };

        // Render sliders
        flowStageSliders.innerHTML = stages.map(stage => `
            <div class="flow-slider-row">
                <span class="flow-slider-label">${stage.name}</span>
                <input type="range" class="flow-slider" data-stage="${stage.id}"
                    min="1" max="15" value="${flowOptimizationState.limits[stage.id]}">
                <span class="flow-slider-value" id="slider-value-${stage.id}">${flowOptimizationState.limits[stage.id]}</span>
            </div>
        `).join('');

        // Setup slider change handlers
        document.querySelectorAll('.flow-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const stage = e.target.dataset.stage;
                const value = parseInt(e.target.value);
                flowOptimizationState.limits[stage] = value;
                document.getElementById(`slider-value-${stage}`).textContent = value;
                document.getElementById(`limit-${stage}`).textContent = value;
            });
        });

        flowOptimizationModal.style.display = 'flex';
    }

    // FIREFIGHTING MINIGAME
    function openFirefightingMinigame(data) {
        const incidents = data.incidents || [];
        firefightingState = {
            incidents: [...incidents],
            priorityAssignments: {}
        };

        // Shuffle incidents for the pool
        const shuffled = [...incidents].sort(() => Math.random() - 0.5);

        // Render incident cards
        incidentCardsContainer.innerHTML = shuffled.map(incident => `
            <div class="incident-card ${incident.severity}" draggable="true" data-incident-id="${incident.id}">
                <div class="incident-title">${incident.title}</div>
                <div class="incident-description">${incident.description}</div>
            </div>
        `).join('');

        // Setup drag and drop
        setupFirefightingDragDrop();

        firefightingModal.style.display = 'flex';
    }

    function setupFirefightingDragDrop() {
        let draggedIncident = null;

        // Incident cards drag start
        document.querySelectorAll('.incident-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedIncident = {
                    id: e.target.dataset.incidentId,
                    element: e.target
                };
                e.target.classList.add('dragging');
            });
            card.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                draggedIncident = null;
            });
        });

        // Priority slots drop handling
        document.querySelectorAll('.priority-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');

                if (draggedIncident && !slot.classList.contains('has-incident')) {
                    const rank = slot.dataset.rank;
                    const incidentData = firefightingState.incidents.find(i => i.id === draggedIncident.id);

                    if (incidentData) {
                        // Record assignment
                        firefightingState.priorityAssignments[draggedIncident.id] = parseInt(rank);

                        // Update slot UI
                        slot.classList.add('has-incident');
                        slot.innerHTML = `
                            <span class="rank-label">${rank}.</span>
                            <div class="incident-card ${incidentData.severity}" style="margin:0">
                                <div class="incident-title">${incidentData.title}</div>
                            </div>
                        `;

                        // Remove from pool
                        draggedIncident.element.remove();
                    }
                }
            });
        });
    }

    // Minigame modal event listeners
    brentRescueClose.onclick = () => {
        closeMinigame();
        // Skip minigame (mark as failed)
        sendAction({ type: 'minigame_result', minigame_type: 'brent_rescue', success: false, score: 0 });
    };

    brentRescueSkip.onclick = () => {
        closeMinigame();
        sendAction({ type: 'minigame_result', minigame_type: 'brent_rescue', success: false, score: 0 });
    };

    brentRescueSubmit.onclick = () => {
        // Check if each dev has at least 3 knowledge items
        const targetKnowledge = 3;
        const success = Object.values(brentRescueState.developerKnowledge).every(
            knowledge => knowledge.length >= targetKnowledge
        );
        const score = Object.values(brentRescueState.developerKnowledge).reduce(
            (sum, knowledge) => sum + knowledge.length, 0
        );
        submitMinigameResult('brent_rescue', success, score);
    };

    flowOptimizationClose.onclick = () => {
        closeMinigame();
        sendAction({ type: 'minigame_result', minigame_type: 'flow_optimization', success: false, score: 0 });
    };

    flowOptimizationSkip.onclick = () => {
        closeMinigame();
        sendAction({ type: 'minigame_result', minigame_type: 'flow_optimization', success: false, score: 0 });
    };

    flowOptimizationSubmit.onclick = () => {
        // Check if limits are close to optimal
        const optimal = { backlog: 10, in_progress: 3, review: 2, deploy: 2 };
        const current = flowOptimizationState.limits;
        const tolerance = 2;

        const success = Object.keys(optimal).every(key => {
            return Math.abs(current[key] - optimal[key]) <= tolerance;
        });

        submitMinigameResult('flow_optimization', success, 0);
    };

    firefightingClose.onclick = () => {
        closeMinigame();
        sendAction({ type: 'minigame_result', minigame_type: 'firefighting', success: false, score: 0 });
    };

    firefightingSkip.onclick = () => {
        closeMinigame();
        sendAction({ type: 'minigame_result', minigame_type: 'firefighting', success: false, score: 0 });
    };

    firefightingSubmit.onclick = () => {
        // Check if all incidents are in correct priority order
        const assignments = firefightingState.priorityAssignments;
        const incidents = firefightingState.incidents;

        let correctCount = 0;
        incidents.forEach(incident => {
            if (assignments[incident.id] === incident.correct_order) {
                correctCount++;
            }
        });

        const success = correctCount === incidents.length;
        submitMinigameResult('firefighting', success, correctCount);
    };

    // Override render to check for minigames
    const originalRender = render;
    render = function(state) {
        originalRender(state);
        checkMinigame(state);
    };

    init();
});
