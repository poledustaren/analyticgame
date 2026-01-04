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

    // Level Up Modal
    const levelupModal = document.getElementById('levelup-modal');
    const levelupSound = document.getElementById('levelup-sound');
    const levelupOldLevel = document.getElementById('levelup-old-level');
    const levelupNewLevel = document.getElementById('levelup-new-level');
    const levelupMessage = document.getElementById('levelup-message');
    const levelupUnlocksList = document.getElementById('levelup-unlocks-list');
    const levelupContinueBtn = document.getElementById('levelup-continue');

    // --- State Management ---
    let currentState = null;

    // --- Level Up Data ---
    const levelData = {
        1: {
            title: "The Stabilizer",
            message: "You've mastered the basics! Brent is still a bottleneck, but you're learning to manage unplanned work."
        },
        2: {
            title: "The First Way (Flow)",
            message: "Excellent progress! You've introduced WIP limits to improve flow and reduce context switching.",
            unlocks: [
                "WIP Limits - Limit work in progress to improve throughput",
                "Flow Visualization - See bottlenecks in real-time",
                "Little's Law - Understand the relationship between WIP, throughput, and lead time"
            ]
        },
        3: {
            title: "The Second Way (Feedback)",
            message: "Great job! You're now creating fast feedback loops from right to left.",
            unlocks: [
                "CAB (Change Advisory Board) - Manage changes more safely",
                "Quality Metrics - Track defects and rework",
                "Fast Feedback - Catch issues sooner"
            ]
        },
        4: {
            title: "The Third Way (Culture)",
            message: "Outstanding! You've built a culture of continual learning and experimentation.",
            unlocks: [
                "Blameless Post-Mortems - Learn from failures without blame",
                "Continual Improvement - Small experiments every week",
                "Learning Organization - Share knowledge across teams"
            ]
        }
    };

    // --- Initialization ---
    function init() {
        // Attach Event Listeners
        newGameBtn.onclick = startNewGame;
        saveGameBtn.onclick = handleSaveGame;
        levelupContinueBtn.onclick = hideLevelUpModal;

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

    // --- Level Up Modal Functions ---
    function showLevelUpModal(oldLevel, newLevel) {
        // Update modal content
        levelupOldLevel.textContent = oldLevel;
        levelupNewLevel.textContent = newLevel;

        const data = levelData[newLevel];
        levelupMessage.textContent = data.message;

        // Populate unlocks list
        levelupUnlocksList.innerHTML = '';
        if (data.unlocks && data.unlocks.length > 0) {
            data.unlocks.forEach(unlock => {
                const li = document.createElement('li');
                li.textContent = unlock;
                levelupUnlocksList.appendChild(li);
            });
        } else {
            levelupUnlocksList.parentElement.style.display = 'none';
        }

        // Play sound
        levelupSound.currentTime = 0;
        levelupSound.play().catch(err => console.log('Audio play failed:', err));

        // Show modal
        levelupModal.style.display = 'flex';

        // Add confetti effect
        createConfetti();
    }

    function hideLevelUpModal() {
        levelupModal.style.display = 'none';
    }

    function createConfetti() {
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#f59e0b'];
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                levelupModal.appendChild(confetti);

                // Remove after animation
                setTimeout(() => confetti.remove(), 3000);
            }, i * 30);
        }
    }

    // --- Rendering Logic ---
    function render(state) {
        // Check for Level Change and show modal
        if (currentState && currentState.level < state.level) {
            showLevelUpModal(currentState.level, state.level);
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

    init();
});
