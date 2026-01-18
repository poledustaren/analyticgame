/**
 * Planning Poker Modal Handler
 *
 * Manages the Planning Poker estimation modal including:
 * - Opening modal for task estimation
 * - Simulating team voting
 * - Displaying consensus results
 * - Applying estimates to tasks
 */

import { sendAction } from '../api.js';
import { SoundSystem } from '../ui.js';
import Toast from '../toast.js';

// ============================================
// STATE
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

// ============================================
// PUBLIC FUNCTIONS
// ============================================

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
// PRIVATE FUNCTIONS
// ============================================

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
