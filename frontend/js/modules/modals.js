/**
 * Modal Handling Module
 *
 * Provides functions for opening, closing, and managing various modals
 * in the application including planning poker, quiz, sprint, event, and
 * save/load modals.
 */

// Import dependencies
import { sendAction } from './api.js';
import { SoundSystem } from './ui.js';

// ============================================
// PLANNING POKER MODAL
// ============================================

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

/**
 * Open Planning Poker modal for a task
 * @param {Object} task - The task to estimate
 */
export function openPlanningPoker(task) {
    if (!task) return;

    currentPokerTask = task;
    selectedPokerValue = null;

    // Get modal elements
    const pokerModal = document.getElementById('poker-modal');
    const pokerTaskTitle = document.getElementById('poker-task-title');
    const pokerTaskDesc = document.getElementById('poker-task-desc');
    const pokerTeamEstimates = document.getElementById('poker-team-estimates');
    const pokerConsensus = document.getElementById('poker-consensus');
    const pokerConfirm = document.getElementById('poker-confirm');

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

/**
 * Simulate team members voting for planning poker
 * @param {Object} task - The task being estimated
 */
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

/**
 * Reveal a team member's card
 * @param {string} memberId - The member's ID
 * @param {number} value - The estimate value
 */
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

/**
 * Show consensus result for planning poker
 */
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

    const pokerFinalValue = document.getElementById('poker-final-value');
    const pokerMessage = document.getElementById('poker-message');

    pokerFinalValue.textContent = consensus;

    if (hasAgreement) {
        pokerMessage.textContent = 'Team reached agreement! Great discussion.';
    } else if (uniqueValues.length > 3) {
        pokerMessage.textContent = 'Wide spread of estimates. Consider discussing the complexity.';
    } else {
        pokerMessage.textContent = 'Close estimates. Minor discussion recommended.';
    }

    document.getElementById('poker-consensus').style.display = 'block';
    SoundSystem.play('success');
}

/**
 * Close Planning Poker modal
 */
export function closePlanningPoker() {
    SoundSystem.play('modalClose');
    document.getElementById('poker-modal').style.display = 'none';
    currentPokerTask = null;
    selectedPokerValue = null;
    teamEstimates = [];
}

/**
 * Apply the agreed estimate to the task
 */
export async function applyPokerEstimate() {
    if (!currentPokerTask) return;

    const pokerFinalValue = document.getElementById('poker-final-value');
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

/**
 * Setup Planning Poker event handlers
 */
export function setupPlanningPokerHandlers() {
    const pokerClose = document.getElementById('poker-close');
    const pokerCancel = document.getElementById('poker-cancel');
    const pokerConfirm = document.getElementById('poker-confirm');

    if (pokerClose) pokerClose.onclick = closePlanningPoker;
    if (pokerCancel) pokerCancel.onclick = closePlanningPoker;
    if (pokerConfirm) pokerConfirm.onclick = applyPokerEstimate;

    // Card selection handlers
    document.querySelectorAll('.poker-card').forEach(card => {
        card.onclick = () => {
            // Remove previous selection
            document.querySelectorAll('.poker-card').forEach(c => c.classList.remove('selected'));

            // Select this card
            card.classList.add('selected');
            selectedPokerValue = card.dataset.value;

            // Enable confirm button
            if (pokerConfirm) pokerConfirm.disabled = false;

            // Play sound
            SoundSystem.play('taskMove');
        };
    });
}

// ============================================
// QUIZ MODAL
// ============================================

/**
 * Quiz modal object
 */
const Quiz = {
    modal: null,
    closeBtn: null,
    toggleBtn: null,
    startBtn: null,
    cancelBtn: null,
    nextBtn: null,
    startScreen: null,
    questionScreen: null,
    resultScreen: null,
    explanation: null,
    questionText: null,
    optionsContainer: null,
    currentNum: null,
    totalNum: null,
    scoreDisplay: null,
    totalDisplay: null,
    modalFooter: null,
    resultIcon: null,
    resultTitle: null,
    resultText: null,
    explanationIcon: null,
    explanationTitle: null,
    explanationText: null,
    currentQuestion: null,
    selectedOption: null,
    totalQuestions: 8,

    /**
     * Initialize Quiz modal
     */
    init() {
        // Get elements
        this.modal = document.getElementById('quiz-modal');
        this.closeBtn = document.getElementById('quiz-close');
        this.toggleBtn = document.getElementById('quiz-toggle-btn');
        this.startBtn = document.getElementById('quiz-start-btn');
        this.cancelBtn = document.getElementById('quiz-cancel');
        this.nextBtn = document.getElementById('quiz-next-question');
        this.startScreen = document.getElementById('quiz-start-screen');
        this.questionScreen = document.getElementById('quiz-question-screen');
        this.resultScreen = document.getElementById('quiz-result-screen');
        this.explanation = document.getElementById('quiz-explanation');
        this.questionText = document.getElementById('quiz-question-text');
        this.optionsContainer = document.getElementById('quiz-options-container');
        this.currentNum = document.getElementById('quiz-current-num');
        this.totalNum = document.getElementById('quiz-total-num');
        this.scoreDisplay = document.getElementById('quiz-score');
        this.totalDisplay = document.getElementById('quiz-total');
        this.modalFooter = document.getElementById('quiz-modal-footer');
        this.resultIcon = document.getElementById('quiz-result-icon');
        this.resultTitle = document.getElementById('quiz-result-title');
        this.resultText = document.getElementById('quiz-result-text');
        this.explanationIcon = document.getElementById('explanation-icon');
        this.explanationTitle = document.getElementById('explanation-title');
        this.explanationText = document.getElementById('explanation-text');

        // Setup event listeners
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.openModal());
        }

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startQuiz());
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextQuestion());
        }

        // Close on overlay click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    // Only allow closing if not in active question
                    if (this.startScreen && this.startScreen.style.display !== 'none') {
                        this.closeModal();
                    }
                }
            });
        }
    },

    /**
     * Open Quiz modal
     */
    openModal() {
        this.resetScreens();
        this.modal.style.display = 'flex';
        if (this.modalFooter) this.modalFooter.style.display = 'flex';
        SoundSystem.play('modalOpen');
    },

    /**
     * Close Quiz modal
     */
    closeModal() {
        this.modal.style.display = 'none';
        SoundSystem.play('modalClose');
    },

    /**
     * Reset quiz screens
     */
    resetScreens() {
        if (this.startScreen) this.startScreen.style.display = 'block';
        if (this.questionScreen) this.questionScreen.style.display = 'none';
        if (this.resultScreen) this.resultScreen.style.display = 'none';
        if (this.explanation) this.explanation.style.display = 'none';
        if (this.startBtn) this.startBtn.style.display = 'inline-block';
        if (this.cancelBtn) this.cancelBtn.style.display = 'inline-block';
    },

    /**
     * Start quiz
     */
    async startQuiz() {
        if (this.startBtn) this.startBtn.style.display = 'none';
        await this.startQuestion();
    },

    /**
     * Start a new question
     */
    async startQuestion() {
        try {
            const API_BASE_URL = 'http://127.0.0.1:5001/api';
            const response = await fetch(`${API_BASE_URL}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'quiz_start' })
            });
            const result = await response.json();

            if (result.quiz?.current_question) {
                this.showQuestion(result.quiz);
            } else if (result.quiz?.remaining === 0) {
                this.showResults(result.quiz);
            } else {
                // No more questions or quiz not available
                this.showResults(result.quiz || { score: 0, total_answered: 0 });
            }
        } catch (error) {
            console.error('Failed to start quiz question:', error);
            SoundSystem.play('error');
            Toast.error('Quiz Error', 'Could not load question', 3000);
        }
    },

    /**
     * Show quiz question
     * @param {Object} quizData - Quiz data containing current question
     */
    showQuestion(quizData) {
        const question = quizData.current_question;
        this.currentQuestion = question;
        this.selectedOption = null;

        // Update progress
        if (this.currentNum) this.currentNum.textContent = quizData.total_answered + 1;
        if (this.totalNum) this.totalNum.textContent = this.totalQuestions;
        if (this.scoreDisplay) this.scoreDisplay.textContent = quizData.score;
        if (this.totalDisplay) this.totalDisplay.textContent = quizData.total_answered;

        // Show question screen
        if (this.startScreen) this.startScreen.style.display = 'none';
        if (this.resultScreen) this.resultScreen.style.display = 'none';
        if (this.explanation) this.explanation.style.display = 'none';
        if (this.questionScreen) this.questionScreen.style.display = 'block';

        // Set question text
        if (this.questionText) this.questionText.textContent = question.question;

        // Render options
        if (this.optionsContainer) {
            this.optionsContainer.innerHTML = '';
            question.options.forEach((option, index) => {
                const optionEl = document.createElement('button');
                optionEl.className = 'quiz-option';
                optionEl.innerHTML = `<span class="quiz-option-letter">${String.fromCharCode(65 + index)}</span>${option}`;
                optionEl.addEventListener('click', () => this.selectOption(index, optionEl));
                this.optionsContainer.appendChild(optionEl);
            });
        }

        // Hide footer during question
        if (this.modalFooter) this.modalFooter.style.display = 'none';
    },

    /**
     * Select quiz option
     * @param {number} index - Option index
     * @param {HTMLElement} element - Option element
     */
    selectOption(index, element) {
        if (element.classList.contains('disabled')) return;

        // Remove previous selection
        document.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Add selection to clicked option
        element.classList.add('selected');
        this.selectedOption = index;

        // Submit answer after a short delay
        setTimeout(() => this.submitAnswer(), 200);
    },

    /**
     * Submit quiz answer
     */
    async submitAnswer() {
        if (this.selectedOption === null) return;

        // Disable all options
        document.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.add('disabled');
        });

        try {
            const API_BASE_URL = 'http://127.0.0.1:5001/api';
            const response = await fetch(`${API_BASE_URL}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'quiz_submit_answer',
                    answer_index: this.selectedOption
                })
            });
            const result = await response.json();

            this.showExplanation(result);
        } catch (error) {
            console.error('Failed to submit answer:', error);
            SoundSystem.play('error');
            Toast.error('Quiz Error', 'Could not submit answer', 3000);
        }
    },

    /**
     * Show answer explanation
     * @param {Object} result - Quiz result
     */
    showExplanation(result) {
        const answerResult = result.quiz?.last_answer_result;
        const question = answerResult?.question || this.currentQuestion;
        const isCorrect = answerResult?.is_correct ?? false;
        const explanation = answerResult?.explanation || '';
        const correctAnswer = answerResult?.correct_answer ?? 0;
        const score = result.quiz?.score ?? 0;
        const total = result.quiz?.total_answered ?? 0;

        // Update options to show correct/incorrect
        const options = document.querySelectorAll('.quiz-option');
        options.forEach((opt, index) => {
            opt.classList.remove('selected');
            if (index === this.selectedOption) {
                opt.classList.add(isCorrect ? 'correct' : 'incorrect');
            } else if (index === correctAnswer) {
                opt.classList.add('correct');
            }
        });

        // Show explanation
        if (this.questionScreen) this.questionScreen.style.display = 'none';
        if (this.explanation) {
            this.explanation.style.display = 'block';
            this.explanation.className = 'quiz-explanation ' + (isCorrect ? 'correct' : 'incorrect');
        }

        if (this.explanationIcon) this.explanationIcon.textContent = isCorrect ? '✅' : '❌';
        if (this.explanationTitle) this.explanationTitle.textContent = isCorrect ? 'Правильно!' : 'Неправильно!';
        if (this.explanationText) this.explanationText.textContent = explanation;

        // Update score display
        if (this.scoreDisplay) this.scoreDisplay.textContent = score;
        if (this.totalDisplay) this.totalDisplay.textContent = total;

        // Play sound
        SoundSystem.play(isCorrect ? 'success' : 'error');

        // Check if quiz is complete
        if (this.nextBtn) {
            if (result.quiz?.remaining === 0) {
                this.nextBtn.textContent = 'Завершить викторину';
            } else {
                this.nextBtn.textContent = 'Следующий вопрос';
            }
        }
    },

    /**
     * Move to next question or show results
     */
    async nextQuestion() {
        if (this.nextBtn && this.nextBtn.textContent === 'Завершить викторину') {
            // Show final results
            const score = this.scoreDisplay ? this.scoreDisplay.textContent : 0;
            const total = this.totalDisplay ? this.totalDisplay.textContent : 0;
            this.showFinalResults(parseInt(score), parseInt(total));
        } else {
            // Load next question
            await this.startQuestion();
        }
    },

    /**
     * Show final quiz results
     * @param {number} score - Score achieved
     * @param {number} total - Total questions
     */
    showFinalResults(score, total) {
        if (this.questionScreen) this.questionScreen.style.display = 'none';
        if (this.explanation) this.explanation.style.display = 'none';
        if (this.resultScreen) this.resultScreen.style.display = 'block';
        if (this.modalFooter) this.modalFooter.style.display = 'flex';

        const percentage = Math.round((score / total) * 100);
        let icon, title;

        if (percentage >= 80) {
            icon = '🏆';
            title = 'Превосходно!';
        } else if (percentage >= 60) {
            icon = '👍';
            title = 'Хороший результат!';
        } else if (percentage >= 40) {
            icon = '📚';
            title = 'Есть к чему стремиться';
        } else {
            icon = '💪';
            title = 'Продолжай учиться!';
        }

        if (this.resultIcon) this.resultIcon.textContent = icon;
        if (this.resultTitle) this.resultTitle.textContent = title;
        if (this.resultText) this.resultText.textContent = `Ты ответил правильно на ${score} из ${total} вопросов (${percentage}%)`;

        // Update start button for restart
        if (this.startBtn) {
            this.startBtn.style.display = 'inline-block';
            this.startBtn.textContent = 'Начать заново';
        }

        if (percentage >= 60) {
            SoundSystem.play('levelUp');
        } else {
            SoundSystem.play('success');
        }

        Toast.success('Quiz Complete', `Score: ${score}/${total}`, 3000);
    },

    /**
     * Show quiz results
     * @param {Object} quizData - Quiz data
     */
    showResults(quizData) {
        const score = quizData.score ?? 0;
        const total = quizData.total_answered ?? 0;
        this.showFinalResults(score, total);
    }
};

/**
 * Open Quiz modal
 */
export function openQuizModal() {
    Quiz.openModal();
}

/**
 * Close Quiz modal
 */
export function closeQuizModal() {
    Quiz.closeModal();
}

/**
 * Initialize Quiz modal handlers
 */
export function setupQuizHandlers() {
    Quiz.init();
}

// ============================================
// SPRINT MODAL (Planning)
// ============================================

let planningSprintTasks = [];

/**
 * Open Sprint Planning modal
 */
export function openPlanningModal() {
    const planningModal = document.getElementById('planning-modal');
    const sprintGoalInput = document.getElementById('sprint-goal-input');
    const sprintDuration = document.getElementById('sprint-duration');

    SoundSystem.play('modalOpen');

    // Clear previous inputs
    if (sprintGoalInput) sprintGoalInput.value = '';
    if (sprintDuration) sprintDuration.value = '2';
    planningSprintTasks = [];

    // Populate available tasks from backlog
    renderPlanningTasks();

    if (planningModal) planningModal.style.display = 'flex';
}

/**
 * Close Sprint Planning modal
 */
export function closePlanningModal() {
    SoundSystem.play('modalClose');
    const planningModal = document.getElementById('planning-modal');
    if (planningModal) planningModal.style.display = 'none';
}

/**
 * Render planning tasks
 */
function renderPlanningTasks() {
    const planningBacklog = document.getElementById('planning-backlog');
    if (!planningBacklog) return;

    // Get current state (would need to be imported or passed in)
    // For now, this is a placeholder
    const backlogTasks = [];
    const sprintTaskIds = [];

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
 * Render sprint backlog
 */
function renderSprintBacklog() {
    const planningSprintBacklog = document.getElementById('planning-sprint-backlog');
    const sprintVelocityPreview = document.getElementById('sprint-velocity-preview');
    if (!planningSprintBacklog) return;

    const sprintTaskIds = planningSprintTasks;
    const allTasks = [];

    const sprintTasks = allTasks.filter(t => sprintTaskIds.includes(t.id));

    // Calculate total points
    const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    if (sprintVelocityPreview) sprintVelocityPreview.textContent = `${totalPoints} pts`;

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
 * Add task to sprint backlog
 * @param {string} taskId - Task ID
 */
function addToSprintBacklog(taskId) {
    planningSprintTasks.push(taskId);
    renderSprintBacklog();
    // Remove from available
    const planningBacklog = document.getElementById('planning-backlog');
    const item = planningBacklog?.querySelector(`[data-task-id="${taskId}"]`);
    if (item) item.remove();
}

/**
 * Remove task from sprint backlog
 * @param {string} taskId - Task ID
 */
function removeFromSprintBacklog(taskId) {
    planningSprintTasks = planningSprintTasks.filter(id => id !== taskId);
    renderSprintBacklog();
}

/**
 * Create sprint from planning modal
 */
export async function createSprint() {
    const sprintGoalInput = document.getElementById('sprint-goal-input');
    const sprintDuration = document.getElementById('sprint-duration');

    const goal = sprintGoalInput?.value.trim() || '';
    const duration = parseInt(sprintDuration?.value) || 2;

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

/**
 * Setup Sprint Planning modal handlers
 */
export function setupSprintModalHandlers() {
    const planningClose = document.getElementById('planning-close');
    const planningCancel = document.getElementById('planning-cancel');
    const planningConfirm = document.getElementById('planning-confirm');

    if (planningClose) planningClose.onclick = closePlanningModal;
    if (planningCancel) planningCancel.onclick = closePlanningModal;
    if (planningConfirm) planningConfirm.onclick = createSprint;
}

// ============================================
// EVENT MODAL
// ============================================

/**
 * Show event modal
 * @param {Object} event - Event object
 */
export function showEventModal(event) {
    if (!event) return;

    SoundSystem.play('modalOpen');

    const eventModal = document.getElementById('event-modal');
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const eventIcon = document.getElementById('event-icon');
    const eventTypeBadge = document.getElementById('event-type-badge');
    const eventSeverityBadge = document.getElementById('event-severity-badge');

    // Update modal content
    if (eventTitle) eventTitle.textContent = event.title;
    if (eventDescription) eventDescription.textContent = event.description;
    if (eventIcon) eventIcon.textContent = extractEventIcon(event.title);

    // Update badges
    if (eventTypeBadge) {
        eventTypeBadge.textContent = event.type || 'EVENT';
        eventTypeBadge.setAttribute('data-type', event.type || 'random');
    }

    if (eventSeverityBadge) {
        eventSeverityBadge.textContent = event.severity || 'MEDIUM';
        eventSeverityBadge.setAttribute('data-severity', (event.severity || 'medium').toLowerCase());
    }

    // Add critical class if severity is critical
    if (eventModal) {
        if (event.severity === 'critical' || event.severity === 'CRITICAL') {
            eventModal.classList.add('critical');
        } else {
            eventModal.classList.remove('critical');
        }
    }

    // Render choices
    renderEventChoices(event.choices || []);

    // Show modal
    if (eventModal) eventModal.style.display = 'flex';
}

/**
 * Extract event icon from title
 * @param {string} title - Event title
 * @returns {string} Icon emoji
 */
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

/**
 * Render event choices
 * @param {Array} choices - Array of choice objects
 */
function renderEventChoices(choices) {
    const eventChoices = document.getElementById('event-choices');
    if (!eventChoices) return;

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
 * Format consequence key
 * @param {string} key - Consequence key
 * @returns {string} Formatted label
 */
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

/**
 * Handle event choice
 * @param {string} choiceId - Choice ID
 * @param {HTMLElement} choiceEl - Choice element
 */
async function handleEventChoice(choiceId, choiceEl) {
    const eventChoices = document.getElementById('event-choices');
    const eventModal = document.getElementById('event-modal');

    // Add selecting animation
    choiceEl.classList.add('selecting');

    // Disable all choices to prevent multiple selections
    if (eventChoices) {
        eventChoices.querySelectorAll('.event-choice').forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = el === choiceEl ? '1' : '0.5';
        });
    }

    SoundSystem.play('success');

    // Send choice to backend
    await sendAction({
        type: 'event_choice',
        choice_id: choiceId
    });

    // Close modal after a short delay to show the selection
    setTimeout(() => {
        SoundSystem.play('modalClose');
        if (eventModal) eventModal.style.display = 'none';

        // Reset choice styles
        if (eventChoices) {
            eventChoices.querySelectorAll('.event-choice').forEach(el => {
                el.style.pointerEvents = '';
                el.style.opacity = '';
                el.classList.remove('selecting');
            });
        }
    }, 300);
}

/**
 * Close event modal
 */
export function closeEventModal() {
    SoundSystem.play('modalClose');
    const eventModal = document.getElementById('event-modal');
    if (eventModal) eventModal.style.display = 'none';
}

// ============================================
// GENERAL MODAL FUNCTIONS
// ============================================

/**
 * Open a modal by ID
 * @param {string} modalId - Modal element ID
 */
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        SoundSystem.play('modalOpen');
        modal.style.display = 'flex';
    }
}

/**
 * Close a modal by ID
 * @param {string} modalId - Modal element ID
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        SoundSystem.play('modalClose');
        modal.style.display = 'none';
    }
}

/**
 * Setup all modal handlers
 */
export function setupModalHandlers() {
    setupPlanningPokerHandlers();
    setupQuizHandlers();
    setupSprintModalHandlers();
}
