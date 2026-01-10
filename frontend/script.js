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
    // Sprint Elements
    const sprintStatus = document.getElementById('sprint-status');
    const sprintBtn = document.getElementById('sprint-btn');
    const sprintPhasesBar = document.getElementById('sprint-phases-bar');
    const sprintGoalText = document.getElementById('sprint-goal-text');
    const standupBtn = document.getElementById('standup-btn');
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

    // --- Tutorial Elements ---
    const tutorialModal = document.getElementById('tutorial-modal');
    const tutorialTitle = document.getElementById('tutorial-title');
    const tutorialStepContent = document.getElementById('tutorial-step-content');
    const tutorialStepIndicator = document.getElementById('tutorial-step-indicator');
    const tutorialPrevBtn = document.getElementById('tutorial-prev');
    const tutorialNextBtn = document.getElementById('tutorial-next');
    const tutorialSkipBtn = document.getElementById('tutorial-skip');
    const tutorialSpotlight = document.getElementById('tutorial-spotlight');
    const tutorialHighlightOverlay = document.getElementById('tutorial-highlight-overlay');

    // --- State Management ---
    let currentState = null;
    let planningSprintTasks = []; // Tasks selected during planning
    let tutorialCurrentStep = 0;

    // --- Tutorial Steps Configuration ---
    const tutorialSteps = [
        {
            title: "Welcome to Phoenix Simulator! \ud83c\udf15",
            icon: "\ud83d\udcb0",
            content: `<h3>Welcome, Operations Lead!</h3>
                <p>You've been tasked with saving Parts Unlimited from disaster. Your goal: stabilize the IT operations and deliver the Phoenix Project on time.</p>
                <p>This tutorial will guide you through the basics of managing your workflow using Kanban and Agile principles.</p>`,
            target: null,
            position: 'center'
        },
        {
            title: "Your Resources \ud83d\udc65",
            icon: "\ud83d\udc65",
            content: `<h3>Brent is your key resource</h3>
                <p>Brent (and other resources) appears here. Some tasks <strong>require Brent</strong> to be completed - they'll show a "NEEDS BRENT" badge.</p>
                <p>Drag Brent's avatar to tasks that need him to unblock work.</p>`,
            target: '#resource-pool',
            position: 'right'
        },
        {
            title: "The Sprint \ud83d\udccb",
            icon: "\ud83d\udccb",
            content: `<h3>Work in Sprints</h3>
                <p>Sprints help you focus on delivering value in fixed timeboxes. Click "Start Sprint" to begin planning.</p>
                <p>During planning, select tasks from the backlog and set a sprint goal.</p>`,
            target: '#sprint-btn',
            position: 'right'
        },
        {
            title: "Kanban Board \ud83d\udccb",
            icon: "\ud83d\udccb",
            content: `<h3>Visualize Your Work</h3>
                <p>This is your Kanban board. Drag tasks between columns to progress them:</p>
                <ul style="margin-left: 20px; color: #94a3b8;">
                    <li><strong>BACKLOG</strong> - Tasks to do</li>
                    <li><strong>IN PROGRESS</strong> - Currently working</li>
                    <li><strong>REVIEW</strong> - Under review</li>
                    <li><strong>DONE</strong> - Completed!</li>
                </ul>
                <p style="margin-top: 8px;">Watch your WIP limit - don't overload the system!</p>`,
            target: '#board-container',
            position: 'left'
        },
        {
            title: "Mentor Guidance \ud83d\udc68\u200d\ud83d\udcbb",
            icon: "\ud83d\udc68\u200d\ud83d\udcbb",
            content: `<h3>Erik is here to help</h3>
                <p>Erik Reid will provide guidance and tips in the Mentor panel. Pay attention to his advice - he knows the way!</p>
                <p>The Team Chat shows communications from your team members.</p>`,
            target: '#right-panel',
            position: 'left'
        },
        {
            title: "Ready to Start! \ud83d\ude80",
            icon: "\ud83d\ude80",
            content: `<h3>You're all set!</h3>
                <p>Remember these key principles:</p>
                <ul style="margin-left: 20px; color: #94a3b8;">
                    <li>Limit WIP to improve flow</li>
                    <li>Assign Brent to blocked tasks</li>
                    <li>Complete sprints to build velocity</li>
                    <li>Keep unplanned work low!</li>
                </ul>
                <p style="margin-top: 8px;">Good luck, Operations Lead. The fate of Parts Unlimited is in your hands!</p>`,
            target: null,
            position: 'center'
        }
    ];

    // --- Initialization ---
    function init() {
        // Attach Event Listeners
        newGameBtn.onclick = startNewGame;
        saveGameBtn.onclick = handleSaveGame;

        // Sprint Event Listeners
        sprintBtn.onclick = handleSprintButtonClick;
        standupBtn.onclick = handleStandupClick;

        // Modal Event Listeners
        planningClose.onclick = closePlanningModal;
        planningCancel.onclick = closePlanningModal;
        planningConfirm.onclick = createSprint;
        reviewToRetroBtn.onclick = goToRetro;
        retroCompleteBtn.onclick = completeRetro;

        // Tutorial Event Listeners
        tutorialSkipBtn.onclick = endTutorial;
        tutorialNextBtn.onclick = nextTutorialStep;
        tutorialPrevBtn.onclick = prevTutorialStep;

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

            // Check if first run - show tutorial
            checkFirstRun();
        } catch (error) {
            console.error("Failed to start game:", error);
        }
    }

    // --- Tutorial Functions ---

    function checkFirstRun() {
        const hasSeenTutorial = localStorage.getItem('phoenix_tutorial_completed');
        if (!hasSeenTutorial) {
            // Small delay to let UI render
            setTimeout(() => startTutorial(), 500);
        }
    }

    function startTutorial() {
        tutorialCurrentStep = 0;
        tutorialModal.style.display = 'flex';
        showTutorialStep(0);
    }

    function showTutorialStep(stepIndex) {
        const step = tutorialSteps[stepIndex];

        // Update content
        tutorialTitle.textContent = step.title;
        tutorialStepIndicator.textContent = `${stepIndex + 1} / ${tutorialSteps.length}`;

        // Build step HTML with icon
        let html = '';
        if (step.icon) {
            html += `<div class="tutorial-step-icon">${step.icon}</div>`;
        }
        html += step.content;
        tutorialStepContent.innerHTML = html;

        // Update buttons
        tutorialPrevBtn.style.display = stepIndex === 0 ? 'none' : 'block';
        tutorialNextBtn.textContent = stepIndex === tutorialSteps.length - 1 ? 'Get Started!' : 'Next';

        // Handle highlight
        highlightElement(step.target, step.position);
    }

    function highlightElement(selector, position) {
        // Clear previous highlights
        clearHighlight();

        if (!selector) {
            // Center position, no highlight
            positionTutorialContent('center');
            tutorialHighlightOverlay.classList.add('active');
            return;
        }

        const target = document.querySelector(selector);
        if (target) {
            const rect = target.getBoundingClientRect();

            // Show overlay
            tutorialHighlightOverlay.classList.add('active');

            // Position and show spotlight
            tutorialSpotlight.style.width = `${rect.width + 16}px`;
            tutorialSpotlight.style.height = `${rect.height + 16}px`;
            tutorialSpotlight.style.top = `${rect.top - 8}px`;
            tutorialSpotlight.style.left = `${rect.left - 8}px`;
            tutorialSpotlight.classList.add('active');

            // Add pulse class to target
            target.classList.add('tutorial-highlight-target');

            // Position tutorial content near the target
            positionTutorialContent(position, rect);
        } else {
            // Target not found, center the modal
            positionTutorialContent('center');
            tutorialHighlightOverlay.classList.add('active');
        }
    }

    function positionTutorialContent(position, targetRect) {
        const content = document.querySelector('.tutorial-content');
        const margin = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Reset positioning
        content.style.top = '';
        content.style.left = '';
        content.style.right = '';
        content.style.bottom = '';
        content.style.transform = '';

        if (position === 'center' || !targetRect) {
            content.style.top = '50%';
            content.style.left = '50%';
            content.style.transform = 'translate(-50%, -50%)';
        } else if (position === 'right') {
            content.style.top = `${Math.min(targetRect.top, viewportHeight - 400)}px`;
            content.style.left = `${targetRect.right + margin}px`;
            // If too far right, move to left of target
            if (targetRect.right + 420 > viewportWidth) {
                content.style.left = '';
                content.style.right = `${viewportWidth - targetRect.left + margin}px`;
            }
        } else if (position === 'left') {
            content.style.top = `${Math.min(targetRect.top, viewportHeight - 400)}px`;
            content.style.right = `${viewportWidth - targetRect.left + margin}px`;
            // If too far left, move to right of target
            if (targetRect.left < 420) {
                content.style.right = '';
                content.style.left = `${targetRect.right + margin}px`;
            }
        }
    }

    function clearHighlight() {
        // Remove spotlight
        tutorialSpotlight.classList.remove('active');
        tutorialHighlightOverlay.classList.remove('active');

        // Remove highlight class from all elements
        document.querySelectorAll('.tutorial-highlight-target').forEach(el => {
            el.classList.remove('tutorial-highlight-target');
        });
    }

    function nextTutorialStep() {
        if (tutorialCurrentStep < tutorialSteps.length - 1) {
            tutorialCurrentStep++;
            showTutorialStep(tutorialCurrentStep);
        } else {
            endTutorial();
        }
    }

    function prevTutorialStep() {
        if (tutorialCurrentStep > 0) {
            tutorialCurrentStep--;
            showTutorialStep(tutorialCurrentStep);
        }
    }

    function endTutorial() {
        clearHighlight();
        tutorialModal.style.display = 'none';
        localStorage.setItem('phoenix_tutorial_completed', 'true');
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

        // Show/hide Daily Standup button
        if (state.daily_standup_available && sprint.phase === 'active') {
            standupBtn.style.display = 'block';
        } else {
            standupBtn.style.display = 'none';
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

    function handleStandupClick() {
        sendAction({ type: 'standup_trigger' });
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

    init();
});
