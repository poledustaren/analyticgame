/**
 * Main Entry Point for Phoenix Project Game
 *
 * This file serves as the main entry point that:
 * 1. Imports all application modules
 * 2. Initializes the app on DOMContentLoaded
 * 3. Sets up all event handlers
 * 4. Coordinates between modules
 *
 * Replaces the old DOMContentLoaded wrapper from script.js
 */

import { SoundSystem } from './modules/sound.js';
import { Toast } from './modules/toast.js';
import * as API from './modules/api.js';
import * as BusFactor from './modules/bus_factor.js';
import { initVSMSection } from './modules/vsm.js';
import { checkDebugMode } from './modules/cheats.js';
import {
    getState,
    setState,
    updateState,
    getPlanningSprintTasks,
    setPlanningSprintTasks,
    addPlanningSprintTask,
    removePlanningSprintTask,
    hasAchievement,
    addAchievement,
    getAchievements,
    resetAchievements,
    getPokerTask,
    setPokerTask,
    getPokerValue,
    setPokerValue,
    getTeamEstimates,
    setTeamEstimates,
    addTeamEstimate,
    resetPokerState,
    resetAllState
} from './modules/state.js';
import {
    renderBoard,
    renderSprintPanel,
    renderLevelProgress,
    renderResources,
    renderLogs,
    renderTraining,
    renderVelocity,
    renderPipeline,
    renderAchievements,
    renderSaveSlots,
    renderEventChoices,
    renderBusFactor,
    renderKnowledge,
    checkKnowledgeAchievements,
    renderValueStreamMap,
    escapeHtml,
    formatDate,
    formatConsequenceKey
} from './modules/render.js';
import {
    initDragDrop,
    setupTaskDragDrop,
    setupResourceDragDrop,
    setupDragDrop
} from './modules/dragdrop.js';

// ============================================
// DOM Elements Cache
// ============================================

const elements = {
    // Layout
    appLayout: null,

    // Sidebar
    levelDisplay: null,
    levelTitle: null,
    resourcePool: null,
    newGameBtn: null,
    saveGameBtn: null,

    // Training
    trainingSection: null,
    trainingStatus: null,
    trainBtn: null,
    advanceWeekBtn: null,

    // Sprint
    sprintStatus: null,
    sprintBtn: null,
    sprintPhasesBar: null,
    sprintGoalText: null,

    // Metrics
    metricBudget: null,
    metricStability: null,
    metricUnplannedBar: null,
    metricUnplannedText: null,
    metricWeek: null,

    // Board
    wipCurrent: null,
    wipLimit: null,
    wipBadge: null,

    // Panels
    mentorLog: null,
    chatLog: null,
    tabBtns: null,
    tabContents: null,

    // Velocity
    velocityChart: null,

    // Modals
    planningModal: null,
    planningClose: null,
    planningCancel: null,
    planningConfirm: null,
    sprintGoalInput: null,
    sprintDuration: null,
    planningBacklog: null,
    planningSprintBacklog: null,
    sprintVelocityPreview: null,
    reviewModal: null,
    reviewToRetroBtn: null,
    retroModal: null,
    retroCompleteBtn: null,

    // Planning Poker
    pokerModal: null,
    pokerClose: null,
    pokerCancel: null,
    pokerConfirm: null,
    pokerTaskTitle: null,
    pokerTaskDesc: null,
    pokerTeamEstimates: null,
    pokerConsensus: null,
    pokerFinalValue: null,
    pokerMessage: null,

    // Event Modal
    eventModal: null,
    eventTitle: null,
    eventDescription: null,
    eventIcon: null,
    eventTypeBadge: null,
    eventSeverityBadge: null,
    eventChoices: null,

    // Progress Indicators
    achievementsContainer: null,
    toastContainer: null
};

// ============================================
// Animation Helper
// ============================================

const Animator = {
    animateValue(element, start, end, duration, formatter = (v) => v) {
        const range = end - start;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            const current = start + (range * easeProgress);
            element.textContent = formatter(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.classList.remove('changed');
            }
        };

        element.classList.add('changed');
        requestAnimationFrame(animate);
    },

    triggerConfetti() {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        document.body.appendChild(container);

        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];
        const particles = 50;

        for (let i = 0; i < particles; i++) {
            const particle = document.createElement('div');
            particle.className = 'confetti-particle';
            particle.style.left = Math.random() * 100 + 'vw';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            particle.style.animationDuration = (2 + Math.random() * 2) + 's';
            container.appendChild(particle);
        }

        setTimeout(() => container.remove(), 4000);
    },

    showLevelUp(oldLevel, newLevel, levelName) {
        const overlay = document.createElement('div');
        overlay.className = 'level-up-overlay';
        overlay.innerHTML = `
            <div class="level-up-content">
                <h1>LEVEL COMPLETE!</h1>
                <p>Level ${oldLevel} → Level ${newLevel}</p>
                <p style="margin-top: 10px; color: var(--accent-success);">${levelName}</p>
            </div>
        `;
        document.body.appendChild(overlay);

        SoundSystem.play('levelUp');
        this.triggerConfetti();

        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s';
            setTimeout(() => overlay.remove(), 500);
        }, 3000);
    }
};

// ============================================
// Toast Notification Helper
// ============================================

function showToast(title, message, type = 'info', duration = 4000) {
    Toast.show({ title, message, type, duration });
}

// ============================================
// Achievement System
// ============================================

function addAchievementBadge(id, icon, text, badgeClass = '') {
    if (hasAchievement(id)) return;

    addAchievement(id);

    // Remove "no achievements" message if present
    const noAchievements = elements.achievementsContainer.querySelector('.no-achievements');
    if (noAchievements) noAchievements.remove();

    const badge = document.createElement('div');
    badge.className = `achievement-badge ${badgeClass}`;
    badge.innerHTML = `
        <span class="badge-icon">${icon}</span>
        <span class="badge-text">${text}</span>
    `;

    elements.achievementsContainer.appendChild(badge);

    // Show toast for new achievement
    showToast('Achievement Unlocked!', text, 'achievement', 5000);
}

// ============================================
// Event Handlers
// ============================================

async function handleTrainDeveloper() {
    await API.sendAction({ type: 'train_developer' });
}

async function handleAdvanceWeek() {
    await API.sendAction({ type: 'advance_week' });
}

async function handleStandupTrigger() {
    await API.sendAction({ type: 'standup_trigger' });
}

async function startNewGame() {
    try {
        const state = await API.startNewGame();
        render(state);
        Toast.success('New Game', 'Starting fresh...', 2000);
    } catch (error) {
        console.error("Failed to start game:", error);
        SoundSystem.play('error');
        Toast.error('Error', 'Failed to start new game', 4000);
    }
}

async function sendAction(actionData) {
    try {
        const newState = await API.sendAction(actionData);

        // Toast notifications for specific actions
        if (actionData.type === 'task_move' && actionData.new_column_id === 'done') {
            showToast('Task Complete!', 'Great work! Keep it up.', 'task-complete', 3000);
        } else if (actionData.type === 'assign_resource') {
            showToast('Resource Assigned', 'Brent is now working on this task.', 'info', 2000);
        } else if (actionData.type === 'sprint_complete_retro') {
            showToast('Sprint Complete!', 'Congratulations on finishing the sprint!', 'success', 4000);
        }

        render(newState);
        return newState;
    } catch (error) {
        console.error("Action failed:", error);
        SoundSystem.play('error');
        Toast.error('Action Failed', 'Could not communicate with server', 3000);
        return null;
    }
}

async function handleSaveGame() {
    try {
        const saves = await API.listSaves();
        openSaveLoadModal('save', saves);
    } catch (error) {
        console.error('Failed to open save dialog:', error);
        Toast.error('Error', 'Failed to open save dialog', 3000);
    }
}

function handleSprintButtonClick() {
    const state = getState();
    if (!state?.current_sprint) {
        openPlanningModal();
    } else {
        const phase = state.current_sprint.phase;
        if (phase === 'planning') {
            // This shouldn't happen - button disabled during planning
            console.error('Sprint button clicked during planning phase');
        } else if (phase === 'active') {
            Toast.info('Sprint Active', 'Complete tasks to finish the sprint', 3000);
        } else if (phase === 'review') {
            openReviewModal();
        } else if (phase === 'retro') {
            openRetroModal();
        }
    }
}

// ============================================
// Render Functions
// ============================================

function render(state) {
    const oldState = getState();

    // Check for Level Change with celebration animation
    if (oldState && oldState.level < state.level) {
        const levelNames = {
            1: "The Stabilizer",
            2: "The First Way (Flow)",
            3: "The Second Way (Feedback)",
            4: "The Third Way (Continual Learning)"
        };
        Animator.showLevelUp(oldState.level, state.level, levelNames[state.level] || '');
    }

    // Check for sprint phase changes
    if (oldState?.current_sprint && state.current_sprint) {
        if (oldState.current_sprint.phase !== state.current_sprint.phase) {
            if (state.current_sprint.phase === 'active') {
                showToast('Sprint Started!', `Sprint ${state.current_sprint.id}: "${state.current_sprint.goal}"`, 'sprint-start');
            } else if (state.current_sprint.phase === 'review') {
                showToast('Sprint Ended!', `Time to review Sprint ${state.current_sprint.id}`, 'sprint-end');
            } else if (state.current_sprint.phase === 'retro') {
                showToast('Sprint Review Complete!', 'Let\'s reflect on what went well', 'info');
            }
        }
    }

    // Update state
    setState(state);

    // 1. Metrics & Level
    elements.levelDisplay.textContent = state.level;
    if (state.level === 1) elements.levelTitle.textContent = "The Stabilizer";
    else if (state.level === 2) elements.levelTitle.textContent = "The First Way (Flow)";
    else if (state.level === 3) elements.levelTitle.textContent = "The Second Way (Feedback)";
    else if (state.level === 4) elements.levelTitle.textContent = "The Third Way (Continual Learning)";

    elements.metricBudget.textContent = `$${state.budget.toLocaleString()}`;
    elements.metricStability.textContent = `${state.stability}%`;
    elements.metricWeek.textContent = state.week;

    // Unplanned Work Bar
    const unplannedPct = state.unplanned_work;
    elements.metricUnplannedBar.style.width = `${unplannedPct}%`;
    elements.metricUnplannedText.textContent = `${unplannedPct}%`;
    if (unplannedPct > 50) elements.metricUnplannedBar.style.backgroundColor = '#ef4444'; // Red
    else if (unplannedPct > 20) elements.metricUnplannedBar.style.backgroundColor = '#f59e0b'; // Orange
    else elements.metricUnplannedBar.style.backgroundColor = '#22c55e'; // Green

    // 2. Sprint UI
    renderSprintPanel(state, elements.sprintBtn, openReviewModal);

    // 2.1 Level Progress
    renderLevelProgress(state, showLevelCompleteModal);

    // 3. Resources (Brent)
    renderResources(state.resources);

    // 4. Board
    renderBoard(state.tasks, state.wip_limit, state, openPlanningPoker);

    // 5. Logs
    renderLogs(state.mentor_log, state.chat_history);

    // 6. Training Section (Level 2+)
    renderTraining(state);

    // 6.5. Bus Factor Section (Level 4+)
    renderBusFactor(state);

    // 6.6. Knowledge Section (Level 4+)
    renderKnowledge(state);

    // 7. Velocity Chart
    renderVelocity(state.velocity_history || []);

    // 7. CI/CD Pipeline (Level 3+)
    renderPipeline(state);

    // 7.5. Value Stream Map (Level 5+)
    renderValueStreamMap(state);

    // 8. Achievements
    renderAchievements(state, getAchievements(), addAchievementBadge);

    // 9. Check for pending events
    checkForPendingEvent(state);
}

function checkForPendingEvent(state) {
    if (state.pending_event) {
        showEventModal(state.pending_event);
    }
}

// ============================================
// Modal Functions (stubs - to be extracted)
// ============================================

function openPlanningModal() {
    // TODO: Extract to modals.js
    console.log('Opening planning modal');
    SoundSystem.play('modalOpen');
}

function closePlanningModal() {
    console.log('Closing planning modal');
    SoundSystem.play('modalClose');
}

function createSprint() {
    console.log('Creating sprint');
}

function openReviewModal() {
    console.log('Opening review modal');
    SoundSystem.play('modalOpen');
}

function showLevelCompleteModal() {
    console.log('Showing level complete modal');
    SoundSystem.play('levelUp');
}

function goToRetro() {
    console.log('Going to retro');
}

function openRetroModal() {
    console.log('Opening retro modal');
    SoundSystem.play('modalOpen');
}

function completeRetro() {
    console.log('Completing retro');
}

function openPlanningPoker(task) {
    console.log('Opening planning poker for task:', task.id);
    SoundSystem.play('modalOpen');
}

function showEventModal(eventData) {
    // TODO: Extract to modals.js
    console.log('Showing event modal:', eventData);
    SoundSystem.play('modalOpen');
}

function openSaveLoadModal(mode, saves) {
    // TODO: Extract to modals.js
    console.log('Opening save/load modal:', mode, saves);
    SoundSystem.play('modalOpen');
}

// Pipeline event handlers
function handlePipelineCreate() {
    console.log('Creating pipeline');
}

function handlePipelineStart() {
    console.log('Starting pipeline');
}

function handlePipelineAdvance() {
    console.log('Advancing pipeline');
}

function handlePipelineReset() {
    console.log('Resetting pipeline');
}

function handlePipelineAutomate() {
    console.log('Automating pipeline');
}

function handleLevelCompleteAdvance() {
    console.log('Advancing to next level');
}

// ============================================
// Initialization
// ============================================

function cacheElements() {
    // Layout
    elements.appLayout = document.getElementById('app-layout');

    // Sidebar
    elements.levelDisplay = document.getElementById('level-display');
    elements.levelTitle = document.getElementById('level-title');
    elements.resourcePool = document.getElementById('resource-pool');
    elements.newGameBtn = document.getElementById('new-game-btn');
    elements.saveGameBtn = document.getElementById('save-game-btn');

    // Training
    elements.trainingSection = document.getElementById('training-section');
    elements.trainingStatus = document.getElementById('training-status');
    elements.trainBtn = document.getElementById('train-btn');
    elements.advanceWeekBtn = document.getElementById('advance-week-btn');

    // Sprint
    elements.sprintStatus = document.getElementById('sprint-status');
    elements.sprintBtn = document.getElementById('sprint-btn');
    elements.standupBtn = document.getElementById('standup-btn');
    elements.sprintPhasesBar = document.getElementById('sprint-phases-bar');
    elements.sprintGoalText = document.getElementById('sprint-goal-text');

    // Metrics
    elements.metricBudget = document.getElementById('metric-budget');
    elements.metricStability = document.getElementById('metric-stability');
    elements.metricUnplannedBar = document.getElementById('metric-unplanned-bar');
    elements.metricUnplannedText = document.getElementById('metric-unplanned-text');
    elements.metricWeek = document.getElementById('metric-week');

    // Board
    elements.wipCurrent = document.getElementById('wip-current');
    elements.wipLimit = document.getElementById('wip-limit');
    elements.wipBadge = document.querySelector('.wip-badge');

    // Panels
    elements.mentorLog = document.getElementById('mentor-log');
    elements.chatLog = document.getElementById('chat-log');
    elements.tabBtns = document.querySelectorAll('.tab-btn');
    elements.tabContents = document.querySelectorAll('.tab-content');

    // Velocity
    elements.velocityChart = document.getElementById('velocity-chart');

    // Modals
    elements.planningModal = document.getElementById('planning-modal');
    elements.planningClose = document.getElementById('planning-close');
    elements.planningCancel = document.getElementById('planning-cancel');
    elements.planningConfirm = document.getElementById('planning-confirm');
    elements.sprintGoalInput = document.getElementById('sprint-goal-input');
    elements.sprintDuration = document.getElementById('sprint-duration');
    elements.planningBacklog = document.getElementById('planning-backlog');
    elements.planningSprintBacklog = document.getElementById('planning-sprint-backlog');
    elements.sprintVelocityPreview = document.getElementById('sprint-velocity-preview');
    elements.reviewModal = document.getElementById('review-modal');
    elements.reviewToRetroBtn = document.getElementById('review-to-retro');
    elements.retroModal = document.getElementById('retro-modal');
    elements.retroCompleteBtn = document.getElementById('retro-complete');

    // Planning Poker
    elements.pokerModal = document.getElementById('poker-modal');
    elements.pokerClose = document.getElementById('poker-close');
    elements.pokerCancel = document.getElementById('poker-cancel');
    elements.pokerConfirm = document.getElementById('poker-confirm');
    elements.pokerTaskTitle = document.getElementById('poker-task-title');
    elements.pokerTaskDesc = document.getElementById('poker-task-desc');
    elements.pokerTeamEstimates = document.getElementById('poker-team-estimates');
    elements.pokerConsensus = document.getElementById('poker-consensus');
    elements.pokerFinalValue = document.getElementById('poker-final-value');
    elements.pokerMessage = document.getElementById('poker-message');

    // Event Modal
    elements.eventModal = document.getElementById('event-modal');
    elements.eventTitle = document.getElementById('event-title');
    elements.eventDescription = document.getElementById('event-description');
    elements.eventIcon = document.getElementById('event-icon');
    elements.eventTypeBadge = document.getElementById('event-type-badge');
    elements.eventSeverityBadge = document.getElementById('event-severity-badge');
    elements.eventChoices = document.getElementById('event-choices');

    // Progress Indicators
    elements.achievementsContainer = document.getElementById('achievements-container');
    elements.toastContainer = document.getElementById('toast-container');
}

function attachEventListeners() {
    // Main button handlers
    elements.newGameBtn.onclick = startNewGame;
    elements.saveGameBtn.onclick = handleSaveGame;

    // Training event listeners
    elements.trainBtn.onclick = handleTrainDeveloper;
    elements.advanceWeekBtn.onclick = handleAdvanceWeek;

    // Sprint event listeners
    elements.sprintBtn.onclick = handleSprintButtonClick;
    if (elements.standupBtn) {
        elements.standupBtn.onclick = handleStandupTrigger;
    }

    // Modal event listeners
    if (elements.planningClose) elements.planningClose.onclick = closePlanningModal;
    if (elements.planningCancel) elements.planningCancel.onclick = closePlanningModal;
    if (elements.planningConfirm) elements.planningConfirm.onclick = createSprint;
    if (elements.reviewToRetroBtn) elements.reviewToRetroBtn.onclick = goToRetro;
    if (elements.retroCompleteBtn) elements.retroCompleteBtn.onclick = completeRetro;

    // CI/CD Pipeline event listeners (Level 3+)
    const pipelineCreateBtn = document.getElementById('pipeline-create-btn');
    const pipelineStartBtn = document.getElementById('pipeline-start-btn');
    const pipelineAdvanceBtn = document.getElementById('pipeline-advance-btn');
    const pipelineResetBtn = document.getElementById('pipeline-reset-btn');
    const pipelineAutomateBtn = document.getElementById('pipeline-automate-btn');

    if (pipelineCreateBtn) pipelineCreateBtn.onclick = handlePipelineCreate;
    if (pipelineStartBtn) pipelineStartBtn.onclick = handlePipelineStart;
    if (pipelineAdvanceBtn) pipelineAdvanceBtn.onclick = handlePipelineAdvance;
    if (pipelineResetBtn) pipelineResetBtn.onclick = handlePipelineReset;
    if (pipelineAutomateBtn) pipelineAutomateBtn.onclick = handlePipelineAutomate;

    // Level Complete Modal
    const levelCompleteAdvanceBtn = document.getElementById('level-complete-advance');
    if (levelCompleteAdvanceBtn) levelCompleteAdvanceBtn.onclick = handleLevelCompleteAdvance;

    // Bus Factor Warning Modal
    const busFactorCloseModal = document.getElementById('bus-factor-close-modal');
    const busFactorCloseBtn = document.getElementById('bus-factor-close-btn');
    const busFactorTakeAction = document.getElementById('bus-factor-take-action');

    if (busFactorCloseModal) {
        busFactorCloseModal.onclick = () => {
            document.getElementById('bus-factor-warning-modal').style.display = 'none';
        };
    }
    if (busFactorCloseBtn) {
        busFactorCloseBtn.onclick = () => {
            document.getElementById('bus-factor-warning-modal').style.display = 'none';
        };
    }
    if (busFactorTakeAction) {
        busFactorTakeAction.onclick = () => {
            document.getElementById('bus-factor-warning-modal').style.display = 'none';
            // Could trigger training or show guidance
            console.log('Bus Factor: User wants to take action');
        };
    }

    // Tab buttons
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            elements.tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        });
    });
}

function initSaveLoadModal() {
    // TODO: Extract save/load modal initialization to modals.js
    console.log('Initializing save/load modal');
}

function init() {
    // Cache all DOM elements
    cacheElements();

    // Initialize UI/UX systems
    SoundSystem.init();
    Toast.init();

    // Check for debug mode (/chita or ?debug=true)
    checkDebugMode();

    // Initialize VSM section (Level 5+)
    initVSMSection();

    // Sound toggle button handler
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.onclick = () => SoundSystem.toggle();
    }

    // Initialize Drag & Drop with dependencies
    initDragDrop({
        currentState: getState,
        sendAction,
        SoundSystem,
        Toast,
        showToast
    });

    // Initialize Save/Load Modal
    initSaveLoadModal();

    // Attach Event Listeners
    attachEventListeners();

    // Setup Drag & Drop
    setupDragDrop();

    // Initialize VSM section (Level 5+)
    initVSMSection();

    // Expose Bus Factor testing functions to global scope (for debugging/testing)
    window.testBusFactor = () => {
        const state = getState();
        BusFactor.renderBusFactor(state);
        console.log('Bus Factor rendered:', state.bus_factor);
    };

    window.testBusFactorWarning = () => {
        const state = getState();
        BusFactor.showBusFactorWarningModal(state.bus_factor);
    };

    window.testDeveloperDeparture = async () => {
        const state = getState();
        console.log('Simulating developer departure...');
        const newState = await BusFactor.simulateDeveloperDeparture(state, sendAction);
        if (newState) {
            console.log('Developer departure handled. New bus factor:', newState.bus_factor);
        }
    };

    // Auto-start new game
    startNewGame();
}

// ============================================
// Application Startup
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Phoenix Project Game initializing...');
    init();
    console.log('Phoenix Project Game initialized');
});
