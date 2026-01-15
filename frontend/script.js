document.addEventListener('DOMContentLoaded', () => {
    // ============================================
    // UI/UX POLISH: Sound System & Notifications
    // ============================================

    // --- Sound System using Web Audio API ---
    const SoundSystem = {
        audioContext: null,
        enabled: true,
        volume: 0.3,

        init() {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported');
                this.enabled = false;
            }
        },

        toggle() {
            this.enabled = !this.enabled;
            const btn = document.getElementById('sound-toggle');
            if (btn) {
                btn.textContent = this.enabled ? '🔊' : '🔇';
                btn.title = this.enabled ? 'Sound on' : 'Sound off';
            }
            return this.enabled;
        },

        play(type) {
            if (!this.enabled || !this.audioContext) return;

            // Resume context if suspended (required by browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const now = this.audioContext.currentTime;

            switch (type) {
                case 'taskMove':
                    this.playTone(440, 'sine', 0.05, now);
                    this.playTone(660, 'sine', 0.05, now + 0.05);
                    break;
                case 'taskComplete':
                    this.playTone(523, 'sine', 0.1, now);
                    this.playTone(659, 'sine', 0.1, now + 0.1);
                    this.playTone(784, 'sine', 0.15, now + 0.2);
                    break;
                case 'sprintStart':
                    this.playTone(392, 'square', 0.1, now);
                    this.playTone(523, 'square', 0.1, now + 0.1);
                    this.playTone(659, 'square', 0.2, now + 0.2);
                    break;
                case 'sprintEnd':
                    this.playTone(659, 'square', 0.15, now);
                    this.playTone(523, 'square', 0.15, now + 0.15);
                    this.playTone(392, 'square', 0.2, now + 0.3);
                    break;
                case 'levelUp':
                    const notes = [523, 659, 784, 1047];
                    notes.forEach((freq, i) => {
                        this.playTone(freq, 'sine', 0.2, now + i * 0.15);
                    });
                    break;
                case 'error':
                    this.playTone(200, 'sawtooth', 0.1, now);
                    this.playTone(150, 'sawtooth', 0.15, now + 0.1);
                    break;
                case 'notification':
                    this.playTone(880, 'sine', 0.05, now);
                    this.playTone(1100, 'sine', 0.05, now + 0.05);
                    break;
                case 'resourceAssign':
                    this.playTone(330, 'triangle', 0.08, now);
                    this.playTone(440, 'triangle', 0.08, now + 0.08);
                    break;
                case 'wipWarning':
                    this.playTone(400, 'square', 0.05, now);
                    setTimeout(() => this.playTone(400, 'square', 0.05), 100);
                    break;
                case 'modalOpen':
                    this.playTone(600, 'sine', 0.05, now);
                    break;
                case 'modalClose':
                    this.playTone(500, 'sine', 0.05, now);
                    break;
                case 'success':
                    this.playTone(523, 'sine', 0.1, now);
                    this.playTone(659, 'sine', 0.1, now + 0.1);
                    break;
            }
        },

        playTone(frequency, type, duration, startTime) {
            if (!this.audioContext) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, startTime);

            // Envelope for smooth sound
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.volume, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        }
    };

    // --- Toast Notification System ---
    const Toast = {
        container: null,
        queue: [],
        isShowing: false,

        init() {
            this.container = document.getElementById('toast-container');
        },

        show(options) {
            const { type = 'info', title = '', message = '', duration = 3000, icon = null } = options;

            const defaultIcons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️',
                'level-up': '🎉',
                'task-complete': '✅',
                'sprint-start': '🚀',
                'sprint-end': '🏁',
                'achievement': '🏆'
            };

            const toastIcon = icon || defaultIcons[type] || defaultIcons.info;

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <span class="toast-icon">${toastIcon}</span>
                <div class="toast-content">
                    ${title ? `<div class="toast-title">${title}</div>` : ''}
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close">&times;</button>
            `;

            // Close button
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.onclick = () => this.dismiss(toast);

            this.container.appendChild(toast);

            // Play notification sound
            SoundSystem.play('notification');

            // Auto-dismiss after duration
            setTimeout(() => this.dismiss(toast), duration);

            return toast;
        },

        dismiss(toast) {
            if (!toast || !toast.parentNode) return;
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        },

        success(title, message, duration) {
            return this.show({ type: 'success', title, message, duration });
        },

        error(title, message, duration) {
            return this.show({ type: 'error', title, message, duration });
        },

        warning(title, message, duration) {
            return this.show({ type: 'warning', title, message, duration });
        },

        info(title, message, duration) {
            return this.show({ type: 'info', title, message, duration });
        }
    };

    // --- Animation Helper Functions ---
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

    // Initialize UI/UX systems
    SoundSystem.init();
    Toast.init();

    // Sound toggle button handler
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.onclick = () => SoundSystem.toggle();
    }

    // ============================================
    // END UI/UX POLISH
    // ============================================

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
    // Planning Poker Elements
    const pokerModal = document.getElementById('poker-modal');
    const pokerClose = document.getElementById('poker-close');
    const pokerCancel = document.getElementById('poker-cancel');
    const pokerConfirm = document.getElementById('poker-confirm');
    const pokerTaskTitle = document.getElementById('poker-task-title');
    const pokerTaskDesc = document.getElementById('poker-task-desc');
    const pokerTeamEstimates = document.getElementById('poker-team-estimates');
    const pokerConsensus = document.getElementById('poker-consensus');
    const pokerFinalValue = document.getElementById('poker-final-value');
    const pokerMessage = document.getElementById('poker-message');

    // Event Modal Elements
    const eventModal = document.getElementById('event-modal');
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const eventIcon = document.getElementById('event-icon');
    const eventTypeBadge = document.getElementById('event-type-badge');
    const eventSeverityBadge = document.getElementById('event-severity-badge');
    const eventChoices = document.getElementById('event-choices');
    // Progress Indicators
    const levelProgressBar = document.getElementById('level-progress-bar');
    const levelProgressText = document.getElementById('level-progress-text');
    const achievementsContainer = document.getElementById('achievements-container');
    const toastContainer = document.getElementById('toast-container');

    // --- State Management ---
    let currentState = null;
    let planningSprintTasks = []; // Tasks selected during planning
    let earnedAchievements = new Set(); // Track earned achievements

    // --- Toast Notification System (for API actions) ---
    function showToast(title, message, type = 'info', duration = 4000) {
        Toast.show({ title, message, type, duration });
    }

    // --- Achievement System ---
    function addAchievement(id, icon, text, badgeClass = '') {
        if (earnedAchievements.has(id)) return;

        earnedAchievements.add(id);

        // Remove "no achievements" message if present
        const noAchievements = achievementsContainer.querySelector('.no-achievements');
        if (noAchievements) noAchievements.remove();

        const badge = document.createElement('div');
        badge.className = `achievement-badge ${badgeClass}`;
        badge.innerHTML = `
            <span class="badge-icon">${icon}</span>
            <span class="badge-text">${text}</span>
        `;

        achievementsContainer.appendChild(badge);

        // Show toast for new achievement
        showToast('Achievement Unlocked!', text, 'achievement', 5000);
    }

    function renderAchievements(state) {
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

    // --- Level Progress Rendering ---
    function renderLevelProgress(state) {
        // Determine level goal based on level
        let current = 0;
        let goal = 3;
        let goalText = 'unplanned tasks';

        if (state.level === 1) {
            // Level 1: Complete 3 unplanned tasks
            const doneTasks = state.tasks?.done || [];
            current = doneTasks.filter(t => t.type === 'unplanned').length;
            goal = 3;
            goalText = 'unplanned tasks';
        } else if (state.level === 2) {
            // Level 2: Achieve 80% stability
            current = Math.round(state.stability);
            goal = 80;
            goalText = 'stability';
        } else {
            // Generic: show sprint completion progress
            const velocityHistory = state.velocity_history || [];
            current = velocityHistory.length;
            goal = 5;
            goalText = 'sprints completed';
        }

        // Calculate percentage
        const percentage = Math.min(100, Math.round((current / goal) * 100));

        // Update progress bar
        levelProgressBar.style.width = `${percentage}%`;
        levelProgressText.textContent = `${current}/${goal}`;

        // Color coding based on progress
        if (percentage >= 100) {
            levelProgressBar.style.background = 'var(--accent-success)';
        } else if (percentage >= 50) {
            levelProgressBar.style.background = 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))';
        } else {
            levelProgressBar.style.background = 'linear-gradient(90deg, var(--accent-warning), var(--accent-primary))';
        }
    }

    // --- Initialization ---
    function init() {
        // Attach Event Listeners
        newGameBtn.onclick = startNewGame;
        saveGameBtn.onclick = handleSaveGame;

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
            Toast.success('New Game', 'Starting fresh...', 2000);
        } catch (error) {
            console.error("Failed to start game:", error);
            SoundSystem.play('error');
            Toast.error('Error', 'Failed to start new game', 4000);
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
        alert("Save functionality placeholder.");
    }

    // --- Rendering Logic ---
    function render(state) {
        // Check for Level Change with celebration animation
        if (currentState && currentState.level < state.level) {
            const levelNames = {
                1: "The Stabilizer",
                2: "The First Way (Flow)",
                3: "The Second Way (Feedback)",
                4: "The Third Way (Continual Learning)"
            };
            Animator.showLevelUp(currentState.level, state.level, levelNames[state.level] || '');
        }

        // Check for sprint phase changes
        if (currentState && currentState.current_sprint && state.current_sprint) {
            if (currentState.current_sprint.phase !== state.current_sprint.phase) {
                if (state.current_sprint.phase === 'active') {
                    showToast('Sprint Started!', `Sprint ${state.current_sprint.id}: "${state.current_sprint.goal}"`, 'sprint-start');
                } else if (state.current_sprint.phase === 'review') {
                    showToast('Sprint Ended!', `Time to review Sprint ${state.current_sprint.id}`, 'sprint-end');
                } else if (state.current_sprint.phase === 'retro') {
                    showToast('Sprint Review Complete!', 'Let\'s reflect on what went well', 'info');
                }
            }
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

        // 2.1 Level Progress
        renderLevelProgress(state);

        // 3. Resources (Brent)
        renderResources(state.resources);

        // 4. Board
        renderBoard(state.tasks, state.wip_limit);

        // 5. Logs
        renderLogs(state.mentor_log, state.chat_history);

        // 6. Velocity Chart
        renderVelocity(state.velocity_history || []);

        // 7. Achievements
        renderAchievements(state);

        // 8. Check for pending events
        checkForPendingEvent(state);
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

        // Highlight WIP violation or fullness with animations
        if (tasks.in_progress.length > limit) {
            wipBadge.style.backgroundColor = '#ef4444'; // Red warning
            wipBadge.style.color = 'white';
            wipBadge.classList.add('critical');
            if (!window.wipWarned) {
                SoundSystem.play('wipWarning');
                Toast.warning('WIP Limit Exceeded!', `You have ${tasks.in_progress.length} items in progress (limit: ${limit})`, 4000);
                window.wipWarned = true;
            }
        } else if (tasks.in_progress.length >= limit) {
            wipBadge.style.backgroundColor = '#f59e0b'; // Orange warning
            wipBadge.style.color = 'white';
            wipBadge.classList.add('warning');
            wipBadge.classList.remove('critical');
        } else {
            wipBadge.style.backgroundColor = '#334155'; // Default
            wipBadge.style.color = '#94a3b8';
            wipBadge.classList.remove('warning', 'critical');
            window.wipWarned = false;
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
                    <button class="task-poker-btn" data-task-id="${task.id}">Re-estimate</button>
                `;

                if (isResourceNeeded && !assignedResId) {
                    card.classList.add('resource-drop-target');
                }

                // Add Planning Poker button handler
                const pokerBtn = card.querySelector('.task-poker-btn');
                if (pokerBtn) {
                    pokerBtn.onclick = (e) => {
                        e.stopPropagation(); // Prevent drag start
                        openPlanningPoker(task);
                    };
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

                    // WIP Limit check for in_progress column
                    if (newColId === 'in_progress' && currentState) {
                        const currentWip = currentState.tasks?.in_progress?.length || 0;
                        const wipLimit = currentState.wip_limit || 3;
                        if (currentWip >= wipLimit) {
                            showToast('WIP Limit Reached!', `Maximum ${wipLimit} tasks allowed in progress.`, 'warning', 4000);
                            return;
                        }
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

                SoundSystem.play('resourceAssign');

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
            SoundSystem.play('sprintStart');
            Toast.success('Sprint Started', 'Good luck with the sprint!', 3000);
            sendAction({ type: 'sprint_start' });
        } else if (currentState.current_sprint.phase === 'active') {
            // End sprint - go to review
            SoundSystem.play('sprintEnd');
            Toast.info('Sprint Ended', 'Time for the Sprint Review', 3000);
            sendAction({ type: 'sprint_end' });
        }
    }

    function openPlanningModal() {
        if (!currentState) return;

        SoundSystem.play('modalOpen');

        // Clear previous inputs
        sprintGoalInput.value = '';
        sprintDuration.value = '2';
        planningSprintTasks = [];

        // Populate available tasks from backlog
        renderPlanningTasks();

        planningModal.style.display = 'flex';
    }

    function closePlanningModal() {
        SoundSystem.play('modalClose');
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

        SoundSystem.play('success');
        Toast.success('Sprint Complete!', 'Retrospective saved. Great work!', 3000);

        await sendAction({
            type: 'sprint_complete_retro',
            notes: notes
        });
    }

    // ============================================
    // PLANNING POKER FEATURE
    // ============================================

    // Planning Poker State
    let currentPokerTask = null;
    let selectedPokerValue = null;
    let teamEstimates = [];

    // Team members for simulation
    const teamMembers = [
        { id: 'dev1', name: 'Alex', role: 'Senior Dev', color: '#3b82f6' },
        { id: 'dev2', name: 'Sam', role: 'Junior Dev', color: '#22c55e' },
        { id: 'qa1', name: 'Jordan', role: 'QA Engineer', color: '#f59e0b' },
        { id: 'ba1', name: 'Casey', role: 'Business Analyst', color: '#8b5cf6' }
    ];

    // Open Planning Poker for a task
    function openPlanningPoker(task) {
        if (!task) return;

        currentPokerTask = task;
        selectedPokerValue = null;

        // Reset UI
        pokerTaskTitle.textContent = task.title;
        pokerTaskDesc.textContent = task.description || 'No description';
        pokerTeamEstimates.innerHTML = '';
        pokerConsensus.style.display = 'none';
        pokerConfirm.disabled = true;

        // Render team members with face-down cards
        teamMembers.forEach(member => {
            const memberCard = document.createElement('div');
            memberCard.className = 'team-member-card';
            memberCard.id = `team-${member.id}`;
            memberCard.innerHTML = `
                <div class="team-member-avatar thinking">${member.name[0]}</div>
                <div class="team-member-estimate face-down"></div>
                <span class="team-member-name">${member.name}</span>
            `;
            pokerTeamEstimates.appendChild(memberCard);
        });

        // Reset player card selection
        document.querySelectorAll('.poker-card').forEach(card => {
            card.classList.remove('selected');
        });

        SoundSystem.play('modalOpen');
        pokerModal.style.display = 'flex';

        // Simulate team voting after a delay
        setTimeout(() => simulateTeamVoting(task), 1500);
    }

    // Simulate team members voting
    function simulateTeamVoting(task) {
        teamEstimates = [];

        // Generate semi-realistic estimates based on task points
        const baseEstimate = task.points || 3;
        const fibonacci = [0, 1, 2, 3, 5, 8, 13, 21];

        teamMembers.forEach((member, index) => {
            setTimeout(() => {
                // Simulate estimate with some variance
                let estimate;
                if (member.role === 'Senior Dev') {
                    // More accurate, closer to actual
                    estimate = baseEstimate;
                } else if (member.role === 'Junior Dev') {
                    // Tends to underestimate
                    estimate = Math.max(1, baseEstimate - 1);
                } else if (member.role === 'QA Engineer') {
                    // Accounts for testing, tends to be higher
                    estimate = Math.min(21, baseEstimate + 2);
                } else {
                    // Business analyst, moderate estimate
                    estimate = baseEstimate;
                }

                // Ensure it's a Fibonacci number
                if (!fibonacci.includes(estimate)) {
                    estimate = fibonacci[Math.min(fibonacci.indexOf(baseEstimate) + 1, fibonacci.length - 1)];
                }

                teamEstimates.push({ memberId: member.id, value: estimate });

                // Reveal the card
                revealTeamCard(member.id, estimate);

                // Check if all have voted
                if (teamEstimates.length === teamMembers.length) {
                    setTimeout(() => showConsensus(), 500);
                }
            }, index * 600 + Math.random() * 400);
        });
    }

    // Reveal a team member's card
    function revealTeamCard(memberId, value) {
        const memberCard = document.getElementById(`team-${memberId}`);
        if (!memberCard) return;

        const avatar = memberCard.querySelector('.team-member-avatar');
        const estimateCard = memberCard.querySelector('.team-member-estimate');

        avatar.classList.remove('thinking');
        estimateCard.classList.remove('face-down');
        estimateCard.classList.add('face-up');
        estimateCard.textContent = value;
    }

    // Show consensus result
    function showConsensus() {
        if (teamEstimates.length === 0) return;

        // Calculate consensus (average, rounded to nearest Fibonacci)
        const values = teamEstimates.map(e => e.value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const fibonacci = [0, 1, 2, 3, 5, 8, 13, 21];

        // Find nearest Fibonacci number
        let consensus = fibonacci.reduce((prev, curr) =>
            Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev
        );

        // Check for agreement
        const uniqueValues = [...new Set(values)];
        const hasAgreement = uniqueValues.length <= 2 &&
            Math.max(...uniqueValues) - Math.min(...uniqueValues) <= 2;

        pokerFinalValue.textContent = consensus;

        if (hasAgreement) {
            pokerMessage.textContent = 'Team reached agreement! Great discussion.';
        } else if (uniqueValues.length > 3) {
            pokerMessage.textContent = 'Wide spread of estimates. Consider discussing the complexity.';
        } else {
            pokerMessage.textContent = 'Close estimates. Minor discussion recommended.';
        }

        pokerConsensus.style.display = 'block';
        SoundSystem.play('success');
    }

    // Close Planning Poker modal
    function closePlanningPoker() {
        SoundSystem.play('modalClose');
        pokerModal.style.display = 'none';
        currentPokerTask = null;
        selectedPokerValue = null;
        teamEstimates = [];
    }

    // Apply the agreed estimate to the task
    async function applyPokerEstimate() {
        if (!currentPokerTask) return;

        const finalValue = pokerFinalValue.textContent;
        const numValue = parseInt(finalValue) || 0;

        SoundSystem.play('success');
        Toast.success('Estimate Applied', `"${currentPokerTask.title}" estimated at ${numValue} points`, 3000);

        await sendAction({
            type: 'poker_estimate',
            task_id: currentPokerTask.id,
            estimate: numValue
        });

        closePlanningPoker();
    }

    // Planning Poker Event Handlers
    pokerClose.onclick = closePlanningPoker;
    pokerCancel.onclick = closePlanningPoker;
    pokerConfirm.onclick = applyPokerEstimate;

    // Card selection handlers
    document.querySelectorAll('.poker-card').forEach(card => {
        card.onclick = () => {
            // Remove previous selection
            document.querySelectorAll('.poker-card').forEach(c => c.classList.remove('selected'));

            // Select this card
            card.classList.add('selected');
            selectedPokerValue = card.dataset.value;

            // Enable confirm button
            pokerConfirm.disabled = false;

            // Play sound
            SoundSystem.play('taskMove');
        };
    });

    // --- Event Modal Functions ---

    function showEventModal(event) {
        if (!event) return;

        SoundSystem.play('modalOpen');

        // Update modal content
        eventTitle.textContent = event.title;
        eventDescription.textContent = event.description;
        eventIcon.textContent = extractEventIcon(event.title);

        // Update badges
        eventTypeBadge.textContent = event.type || 'EVENT';
        eventTypeBadge.setAttribute('data-type', event.type || 'random');

        eventSeverityBadge.textContent = event.severity || 'MEDIUM';
        eventSeverityBadge.setAttribute('data-severity', (event.severity || 'medium').toLowerCase());

        // Add critical class if severity is critical
        if (event.severity === 'critical' || event.severity === 'CRITICAL') {
            eventModal.classList.add('critical');
        } else {
            eventModal.classList.remove('critical');
        }

        // Render choices
        renderEventChoices(event.choices || []);

        // Show modal
        eventModal.style.display = 'flex';
    }

    function extractEventIcon(title) {
        // Extract emoji from title if present
        const emojiMatch = title.match(/^([\p{Emoji}\u200d]+)\s/u);
        if (emojiMatch) return emojiMatch[1];

        // Default icons based on event type keywords
        const iconMap = {
            'bug': '🐛',
            'fire': '🔥',
            'deployment': '🚀',
            'requirement': '📝',
            'deadline': '⏰',
            'feature': '✨',
            'team': '👥',
            'sick': '🤒',
            'conflict': '😤',
            'morale': '😔',
            'vendor': '📦',
            'security': '🔒',
            'server': '🖥️',
            'outage': '🔴',
            'audit': '📋'
        };

        const lowerTitle = title.toLowerCase();
        for (const [keyword, icon] of Object.entries(iconMap)) {
            if (lowerTitle.includes(keyword)) return icon;
        }

        return '⚠️'; // Default icon
    }

    function renderEventChoices(choices) {
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

    function formatConsequenceKey(key) {
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

    async function handleEventChoice(choiceId, choiceEl) {
        // Add selecting animation
        choiceEl.classList.add('selecting');

        // Disable all choices to prevent multiple selections
        eventChoices.querySelectorAll('.event-choice').forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = el === choiceEl ? '1' : '0.5';
        });

        SoundSystem.play('success');

        // Send choice to backend
        const newState = await sendAction({
            type: 'event_choice',
            choice_id: choiceId
        });

        // Close modal after a short delay to show the selection
        setTimeout(() => {
            SoundSystem.play('modalClose');
            eventModal.style.display = 'none';

            // Reset choice styles
            eventChoices.querySelectorAll('.event-choice').forEach(el => {
                el.style.pointerEvents = '';
                el.style.opacity = '';
                el.classList.remove('selecting');
            });
        }, 300);
    }

    function closeEventModal() {
        SoundSystem.play('modalClose');
        eventModal.style.display = 'none';
    }

    // Check for pending events in state
    function checkForPendingEvent(state) {
        if (state.pending_event) {
            // Small delay to ensure render completes first
            setTimeout(() => {
                showEventModal(state.pending_event);
            }, 100);
            return true;
        }
        return false;
    }

    init();
});
