/**
 * Quiz Modal Handler
 *
 * Manages the Quiz modal including:
 * - Starting quiz sessions
 * - Displaying questions and options
 * - Submitting and validating answers
 * - Showing results and explanations
 */

import { SoundSystem } from '../ui.js';
import Toast from '../toast.js';

// ============================================
// QUIZ MODULE
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

// ============================================
// PUBLIC EXPORTS
// ============================================

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
