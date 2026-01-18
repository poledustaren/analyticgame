/**
 * Bus Factor Module
 *
 * Manages the Bus Factor metric UI and interactions.
 * Bus Factor represents how many team members know critical systems.
 * Low bus factor is a risk - if key people leave, knowledge is lost.
 */

/**
 * Render Bus Factor display in the sidebar
 * @param {Object} state - Current game state
 */
export function renderBusFactor(state) {
    const busFactorContainer = document.getElementById('bus-factor-container');
    const busFactorValue = document.getElementById('bus-factor-value');
    const busFactorWarning = document.getElementById('bus-factor-warning');
    const busFactorStatus = document.getElementById('bus-factor-status');

    if (!busFactorContainer || !busFactorValue) return;

    // Get current bus factor
    const busFactor = state.bus_factor || 1;

    // Update value display
    busFactorValue.textContent = busFactor;

    // Clear previous status
    busFactorValue.className = 'bus-factor-value';
    busFactorWarning.className = 'bus-factor-warning';
    busFactorWarning.style.display = 'none';
    if (busFactorStatus) {
        busFactorStatus.className = 'bus-factor-status';
    }

    // Determine status and apply styling
    if (busFactor === 1) {
        // CRITICAL: Only one person knows critical systems
        busFactorValue.classList.add('critical');
        busFactorWarning.style.display = 'block';
        busFactorWarning.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
                <strong>CRITICAL RISK</strong><br>
                Only 1 person knows critical systems!
            </div>
        `;
        if (busFactorStatus) {
            busFactorStatus.classList.add('critical');
            busFactorStatus.textContent = 'Critical';
        }
    } else if (busFactor < 3) {
        // WARNING: Low bus factor
        busFactorValue.classList.add('warning');
        busFactorWarning.style.display = 'block';
        busFactorWarning.innerHTML = `
            <div class="warning-icon">⚡</div>
            <div class="warning-text">
                <strong>LOW BUS FACTOR</strong><br>
                If ${busFactor === 2 ? 'one' : 'two'} people leave, critical knowledge is lost!
            </div>
        `;
        if (busFactorStatus) {
            busFactorStatus.classList.add('warning');
            busFactorStatus.textContent = 'Low';
        }
    } else {
        // GOOD: Healthy bus factor
        busFactorValue.classList.add('good');
        busFactorWarning.style.display = 'none';
        if (busFactorStatus) {
            busFactorStatus.classList.add('good');
            busFactorStatus.textContent = 'Healthy';
        }
    }

    // Show Bus Factor section from Level 4
    const busFactorSection = document.getElementById('bus-factor-section');
    if (busFactorSection) {
        busFactorSection.style.display = state.level >= 4 ? 'block' : 'none';
    }
}

/**
 * Handle developer departure event
 * This should be called when an event causes a developer to leave
 * @param {Object} state - Current game state
 * @param {Function} sendAction - API action function
 * @param {string} developerId - ID of the developer leaving
 * @returns {Promise<Object>} Updated state
 */
export async function handleDeveloperDeparture(state, sendAction, developerId) {
    const developer = state.resources?.find(r => r.id === developerId);

    if (!developer) {
        console.error(`Developer ${developerId} not found`);
        return null;
    }

    // Check if this developer was critical
    const wasCritical = developer.role === 'Brent' ||
                       (developer.skills && developer.skills.includes('critical_systems'));

    if (!wasCritical) {
        // Not a critical developer, bus factor doesn't change
        return null;
    }

    // Decrease bus factor
    const newBusFactor = Math.max(1, (state.bus_factor || 1) - 1);

    try {
        const newState = await sendAction({
            type: 'developer_departure',
            developer_id: developerId,
            new_bus_factor: newBusFactor
        });

        return newState;
    } catch (error) {
        console.error('Failed to process developer departure:', error);
        return null;
    }
}

/**
 * Show Bus Factor warning modal
 * @param {number} currentBusFactor - Current bus factor value
 */
export function showBusFactorWarningModal(currentBusFactor) {
    const modal = document.getElementById('bus-factor-warning-modal');
    if (!modal) return;

    const message = currentBusFactor === 1
        ? 'Critical risk! Only one person knows the critical systems. If they leave or get hit by a bus, the project is in serious trouble.'
        : `Warning: Only ${currentBusFactor} people know critical systems. If key team members leave, knowledge will be lost.`;

    const advice = currentBusFactor === 1
        ? 'Immediate action required: Train more team members on critical systems!'
        : 'Consider: Start training sessions to increase team knowledge coverage.';

    modal.querySelector('.bus-factor-modal-message').textContent = message;
    modal.querySelector('.bus-factor-modal-advice').textContent = advice;

    modal.style.display = 'block';
}

/**
 * Hide Bus Factor warning modal
 */
export function hideBusFactorWarningModal() {
    const modal = document.getElementById('bus-factor-warning-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Update Bus Factor after training completion
 * @param {Object} state - Current game state
 * @param {Function} sendAction - API action function
 * @returns {Promise<Object>} Updated state
 */
export async function updateBusFactorAfterTraining(state, sendAction) {
    const newBusFactor = (state.bus_factor || 1) + 1;

    try {
        const newState = await sendAction({
            type: 'update_bus_factor',
            new_bus_factor: newBusFactor,
            reason: 'training_completed'
        });

        return newState;
    } catch (error) {
        console.error('Failed to update bus factor:', error);
        return null;
    }
}

/**
 * Get Bus Factor assessment text
 * @param {number} busFactor - Current bus factor value
 * @returns {string} Assessment text
 */
export function getBusFactorAssessment(busFactor) {
    if (busFactor === 1) {
        return 'Single Point of Failure';
    } else if (busFactor === 2) {
        return 'Fragile';
    } else if (busFactor === 3) {
        return 'Adequate';
    } else if (busFactor === 4) {
        return 'Good';
    } else {
        return 'Excellent';
    }
}

/**
 * Check if Bus Factor warning should be shown
 * @param {number} busFactor - Current bus factor value
 * @returns {boolean} True if warning should be shown
 */
export function shouldShowBusFactorWarning(busFactor) {
    return busFactor < 2;
}

/**
 * Initialize Bus Factor module
 * Sets up event listeners and initial render
 * @param {Object} state - Current game state
 * @param {Function} sendAction - API action function
 */
export function initBusFactor(state, sendAction) {
    // Initial render
    renderBusFactor(state);

    // Set up close button for warning modal if it exists
    const closeModalBtn = document.getElementById('bus-factor-close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideBusFactorWarningModal);
    }

    // Set up "Take Action" button for warning modal
    const takeActionBtn = document.getElementById('bus-factor-take-action');
    if (takeActionBtn) {
        takeActionBtn.addEventListener('click', () => {
            hideBusFactorWarningModal();
            // Could open training modal or show guidance
            console.log('User wants to take action on Bus Factor');
        });
    }

    // Show warning if bus factor is critical
    if (state.bus_factor < 2 && state.level >= 4) {
        showBusFactorWarningModal(state.bus_factor);
    }
}

/**
 * Simulate a developer departure event (for testing/demo)
 * @param {Object} state - Current game state
 * @param {Function} sendAction - API action function
 */
export async function simulateDeveloperDeparture(state, sendAction) {
    // Find Brent (the critical developer)
    const brent = state.resources?.find(r => r.name === 'Brent' || r.role === 'Brent');

    if (!brent) {
        console.error('Brent not found in resources');
        return null;
    }

    // Handle the departure
    const newState = await handleDeveloperDeparture(state, sendAction, brent.id);

    // Show warning if bus factor is now critical
    if (newState && newState.bus_factor < 2) {
        showBusFactorWarningModal(newState.bus_factor);
    }

    return newState;
}
