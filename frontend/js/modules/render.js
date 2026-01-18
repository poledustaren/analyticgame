/**
 * Render Module
 *
 * Contains all UI rendering functions for the game state.
 * Extracted from script.js for better modularity.
 */

// Import Bus Factor rendering
import { renderBusFactor as renderBusFactorModule } from './bus_factor.js';

// Import Knowledge rendering
import { renderKnowledge as renderKnowledgeModule, checkKnowledgeAchievements as checkKnowledgeAchievementsModule } from './knowledge.js';

// Import VSM rendering
import { renderVSM } from './vsm.js';

// Import Lead Time rendering
import {
    renderLeadTimeSummary,
    renderLeadTimeChart,
    renderThroughputChart,
    refreshLeadTimeDisplay
} from './lead_time.js';

/**
 * Render Bus Factor display
 * @param {Object} state - Current game state
 */
export function renderBusFactor(state) {
    renderBusFactorModule(state);
}

/**
 * Render Knowledge display
 * @param {Object} state - Current game state
 */
export function renderKnowledge(state) {
    renderKnowledgeModule(state);
}

/**
 * Check Knowledge achievements
 * @param {Object} state - Current game state
 * @param {Set} earnedAchievements - Set of earned achievement IDs
 * @param {Function} addAchievement - Function to add an achievement
 */
export function checkKnowledgeAchievements(state, earnedAchievements, addAchievement) {
    checkKnowledgeAchievementsModule(state, earnedAchievements, addAchievement);
}

/**
 * Render Value Stream Map
 * @param {Object} state - Current game state
 */
export function renderValueStreamMap(state) {
    renderVSM(state);
}

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

/**
 * Render sprint panel
 * @param {Object} state - Current game state
 * @param {HTMLElement} sprintBtn - Sprint button element
 * @param {Function} showReviewModal - Function to show review modal
 */
export function renderSprintPanel(state, sprintBtn, showReviewModal) {
    const sprint = state.current_sprint;
    const sprintStatus = document.getElementById('sprint-status');
    const sprintPhasesBar = document.getElementById('sprint-phases-bar');
    const sprintGoalText = document.getElementById('sprint-goal-text');

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
        if (showReviewModal) showReviewModal(sprint, state);
    } else if (sprint.phase === 'retro') {
        // Retro modal should be open
        sprintBtn.textContent = 'In Retro';
        sprintBtn.className = 'sprint-btn secondary';
    }
}

/**
 * Render level progress display
 * @param {Object} state - Current game state
 * @param {Function} showLevelCompleteModal - Function to show level complete modal
 */
export function renderLevelProgress(state, showLevelCompleteModal) {
    const levelDisplay = document.getElementById('level-display');
    const levelTitle = document.getElementById('level-title');

    // Update level display and title
    levelDisplay.textContent = state.level;

    const titles = {
        1: 'The Stabilizer',
        2: 'The Visualizer',
        3: 'The Feedback Loop',
        4: 'The Teacher',
        5: 'The Experimenter',
        6: 'The Master'
    };
    levelTitle.textContent = titles[state.level] || `Level ${state.level}`;

    // Render level goals
    renderLevelGoals(state);

    // Check for level complete
    if (state.level_complete && showLevelCompleteModal) {
        showLevelCompleteModal(state.level_complete);
    }
}

/**
 * Render level goals
 * @param {Object} state - Current game state
 */
export function renderLevelGoals(state) {
    const goalsList = document.getElementById('level-goals-list');
    if (!goalsList) return;

    const goals = state.level_goals || [];

    if (goals.length === 0) {
        goalsList.innerHTML = '<p class="no-goals">No active goals</p>';
        return;
    }

    goalsList.innerHTML = goals.map(goal => {
        const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
        const isComplete = goal.completed;

        return `
            <div class="level-goal-item ${isComplete ? 'completed' : ''}">
                <span class="level-goal-icon">${goal.icon}</span>
                <div class="level-goal-content">
                    <div class="level-goal-description">${goal.description}</div>
                    <div class="level-goal-progress">
                        <div class="level-goal-bar">
                            <div class="level-goal-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="level-goal-text">${goal.current}/${goal.target}</span>
                    </div>
                </div>
                <div class="level-goal-check">${isComplete ? '✓' : ''}</div>
            </div>
        `;
    }).join('');
}

/**
 * Render velocity chart
 * @param {Array} velocityHistory - Array of velocity objects
 */
export function renderVelocity(velocityHistory) {
    const velocityChart = document.getElementById('velocity-chart');

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

/**
 * Render CI/CD pipeline
 * @param {Object} state - Current game state
 */
export function renderPipeline(state) {
    const cicdSection = document.getElementById('cicd-section');
    const pipelineCreateBtn = document.getElementById('pipeline-create-btn');
    const pipelineStartBtn = document.getElementById('pipeline-start-btn');
    const pipelineAdvanceBtn = document.getElementById('pipeline-advance-btn');
    const pipelineResetBtn = document.getElementById('pipeline-reset-btn');
    const pipelineAutomateBtn = document.getElementById('pipeline-automate-btn');
    const pipelineContainer = document.getElementById('pipeline-container');
    const pipelineStages = document.getElementById('pipeline-stages');
    const pipelineStats = document.getElementById('pipeline-stats');

    // Show CI/CD section only from Level 3
    if (state.level >= 3) {
        cicdSection.style.display = 'block';
    } else {
        cicdSection.style.display = 'none';
        return;
    }

    const pipeline = state.cicd_pipeline;

    if (!pipeline) {
        // No pipeline created yet
        pipelineCreateBtn.style.display = 'inline-block';
        pipelineStartBtn.style.display = 'none';
        pipelineAdvanceBtn.style.display = 'none';
        pipelineResetBtn.style.display = 'none';
        pipelineAutomateBtn.style.display = 'none';
        pipelineContainer.style.display = 'block';
        pipelineContainer.innerHTML = '<div class="pipeline-empty">Create a pipeline to visualize your deployment process (Level 3+)</div>';
        pipelineStages.style.display = 'none';
        pipelineStats.style.display = 'none';
    } else {
        // Pipeline exists
        pipelineCreateBtn.style.display = 'none';
        pipelineStartBtn.style.display = 'inline-block';
        pipelineAdvanceBtn.style.display = 'inline-block';
        pipelineResetBtn.style.display = 'inline-block';
        pipelineAutomateBtn.style.display = pipeline.is_automated ? 'none' : 'inline-block';
        pipelineContainer.style.display = 'none';
        pipelineStages.style.display = 'flex';
        pipelineStats.style.display = 'flex';

        // Update coverage bar
        const coverage = pipeline.coverage || state.cicd_coverage || 0;
        document.getElementById('cicd-coverage-bar').style.width = `${coverage}%`;
        document.getElementById('cicd-coverage-text').textContent = `${coverage}%`;

        // Update stats
        document.getElementById('pipeline-runs').textContent = pipeline.total_runs || 0;
        document.getElementById('pipeline-success').textContent = pipeline.successful_runs || 0;
        document.getElementById('pipeline-failed').textContent = pipeline.failed_runs || 0;

        // Render stages
        const stageElements = pipelineStages.querySelectorAll('.pipeline-stage');
        const arrows = pipelineStages.querySelectorAll('.pipeline-arrow');

        let foundCurrent = false;
        stageElements.forEach((stageEl, index) => {
            const stageName = stageEl.dataset.stage;
            const stageData = pipeline.stages[stageName];

            stageEl.classList.remove('active', 'success', 'failed', 'pending');

            if (stageData) {
                if (stageData.status === 'running') {
                    stageEl.classList.add('active');
                    foundCurrent = true;
                } else if (stageData.status === 'success') {
                    stageEl.classList.add('success');
                } else if (stageData.status === 'failed') {
                    stageEl.classList.add('failed');
                } else {
                    stageEl.classList.add('pending');
                }
            }
        });

        // Update arrows
        arrows.forEach((arrow, index) => {
            arrow.classList.remove('active', 'success');
            if (index < stageElements.length - 1) {
                const currentStage = stageElements[index];
                if (currentStage.classList.contains('success')) {
                    arrow.classList.add('success');
                } else if (currentStage.classList.contains('active')) {
                    arrow.classList.add('active');
                }
            }
        });
    }
}

/**
 * Render logs (mentor and team messages)
 * @param {Array} mentorMessages - Array of mentor message objects
 * @param {Array} teamMessages - Array of team message objects
 */
export function renderLogs(mentorMessages, teamMessages) {
    const mentorLog = document.getElementById('mentor-log');
    const chatLog = document.getElementById('chat-log');

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

/**
 * Render achievements based on state
 * @param {Object} state - Current game state
 * @param {Set} earnedAchievements - Set of earned achievement IDs
 * @param {Function} addAchievement - Function to add an achievement
 */
export function renderAchievements(state, earnedAchievements, addAchievement) {
    // Check for achievements based on state

    // Level completion achievement
    if (state.level >= 2 && !earnedAchievements.has('level-1-complete')) {
        addAchievement('level-1-complete', '🎯', 'Level 1 Complete', 'level-complete');
    }
    if (state.level >= 3 && !earnedAchievements.has('level-2-complete')) {
        addAchievement('level-2-complete', '⭐', 'Level 2 Complete', 'level-complete');
    }

    // Sprint completion achievement
    const velocityHistory = state.velocity_history || [];
    if (velocityHistory.length >= 1 && !earnedAchievements.has('first-sprint')) {
        addAchievement('first-sprint', '🏁', 'First Sprint', 'sprint-complete');
    }
    if (velocityHistory.length >= 3 && !earnedAchievements.has('sprint-veteran')) {
        addAchievement('sprint-veteran', '🎖️', 'Sprint Veteran', 'sprint-complete');
    }

    // High velocity achievement (100% sprint completion)
    if (velocityHistory.length > 0) {
        const lastSprint = velocityHistory[velocityHistory.length - 1];
        if (lastSprint.planned > 0 && lastSprint.actual >= lastSprint.planned) {
            if (!earnedAchievements.has('perfect-sprint')) {
                addAchievement('perfect-sprint', '💯', 'Perfect Sprint', 'goal-complete');
            }
        }
    }

    // Stability achievement
    if (state.stability >= 80 && !earnedAchievements.has('stable-team')) {
        addAchievement('stable-team', '🛡️', 'Stable Team', 'goal-complete');
    }

    // Low unplanned work achievement
    if (state.unplanned_work <= 20 && !earnedAchievements.has('under-control')) {
        addAchievement('under-control', '✨', 'Under Control', 'goal-complete');
    }
}

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
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date string
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(isoString) {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format consequence key to label
 * @param {string} key - Consequence key
 * @returns {string} Formatted label
 */
export function formatConsequenceKey(key) {
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

/**
 * Render Lead Time metrics display
 * @param {Object} state - Current game state
 */
export async function renderLeadTime(state) {
    // Only show lead time section from Level 5
    if (state.level < 5) {
        const leadTimeSection = document.getElementById('lead-time-section');
        if (leadTimeSection) {
            leadTimeSection.style.display = 'none';
        }
        return;
    }

    // Show lead time section
    const leadTimeSection = document.getElementById('lead-time-section');
    if (leadTimeSection) {
        leadTimeSection.style.display = 'block';
    }

    // Refresh all lead time displays
    await refreshLeadTimeDisplay();
}
