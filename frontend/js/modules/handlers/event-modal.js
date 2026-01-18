/**
 * Event Modal Handler
 *
 * Manages the Event Choice modal including:
 * - Displaying event details
 * - Rendering event choices with consequences
 * - Handling user selections
 */

import { sendAction } from '../api.js';
import { SoundSystem } from '../ui.js';

// ============================================
// PUBLIC FUNCTIONS
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
 * Close event modal
 */
export function closeEventModal() {
    SoundSystem.play('modalClose');
    const eventModal = document.getElementById('event-modal');
    if (eventModal) eventModal.style.display = 'none';
}

// ============================================
// PRIVATE FUNCTIONS
// ============================================

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
