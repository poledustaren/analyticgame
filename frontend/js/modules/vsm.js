/**
 * Value Stream Mapping (VSM) Module
 *
 * Visualizes the flow of value through the development pipeline,
 * highlighting waste (muda) in red based on vsm_ratio.
 * Part of Level 5: The Experimenter
 */

/**
 * Render VSM chart to the page
 * @param {Object} state - Current game state
 */
export function renderVSM(state) {
    const vsmSection = document.getElementById('vsm-section');

    if (!vsmSection) {
        console.warn('VSM section not found in DOM');
        return;
    }

    // Show VSM only from Level 5
    if (state.level < 5) {
        vsmSection.style.display = 'none';
        return;
    }

    vsmSection.style.display = 'block';

    const vsmRatio = state.vsm_ratio || 90;
    const wastePercentage = vsmRatio; // 90 means 90% waste

    // Create VSM visualization using SVG
    const vsmContainer = document.getElementById('vsm-container');
    vsmContainer.innerHTML = createVSMVisualization(wastePercentage);

    // Update metrics display
    updateVSMMetrics(wastePercentage);

    // Update legend
    updateVSMLegend();
}

/**
 * Create SVG visualization for Value Stream Map
 * @param {number} wastePercentage - Percentage of waste (0-100)
 * @returns {string} SVG HTML string
 */
function createVSMVisualization(wastePercentage) {
    const stages = [
        { name: 'Backlog', valueTime: 0, wasteTime: 14, color: '#ef4444' },
        { name: 'Development', valueTime: 8, wasteTime: 12, color: '#ef4444' },
        { name: 'Testing', valueTime: 2, wasteTime: 8, color: '#ef4444' },
        { name: 'Deploy', valueTime: 1, wasteTime: 6, color: '#ef4444' },
        { name: 'Value', valueTime: 5, wasteTime: 0, color: '#22c55e' }
    ];

    // Calculate widths based on waste ratio
    const totalTime = stages.reduce((sum, stage) => sum + stage.valueTime + stage.wasteTime, 0);
    const pixelsPerDay = 800 / totalTime;

    let svg = `
        <svg viewBox="0 0 900 250" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="valueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="wasteGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>

            <!-- Title -->
            <text x="450" y="25" text-anchor="middle" class="vsm-title">Value Stream Map</text>

            <!-- Timeline -->
    `;

    let xOffset = 50;
    let yValue = 80;
    let yWaste = 140;

    stages.forEach((stage, index) => {
        const valueWidth = stage.valueTime * pixelsPerDay;
        const wasteWidth = stage.wasteTime * pixelsPerDay;

        // Draw waste bar (if any)
        if (stage.wasteTime > 0) {
            svg += `
                <g class="vsm-waste-bar">
                    <rect x="${xOffset}" y="${yWaste}" width="${wasteWidth}" height="50"
                          fill="url(#wasteGradient)" filter="url(#shadow)" rx="4"/>
                    <text x="${xOffset + wasteWidth/2}" y="${yWaste + 30}"
                          text-anchor="middle" fill="white" font-size="12" font-weight="bold">
                        ${stage.wasteTime}d
                    </text>
                </g>
            `;

            // Connector from waste to value (if value exists)
            if (stage.valueTime > 0) {
                svg += `
                    <path d="M ${xOffset + wasteWidth} ${yWaste + 25} L ${xOffset + wasteWidth} ${yValue + 25}"
                          stroke="#94a3b8" stroke-width="2" stroke-dasharray="4"/>
                `;
            }

            xOffset += wasteWidth;
        }

        // Draw value bar (if any)
        if (stage.valueTime > 0) {
            svg += `
                <g class="vsm-value-bar">
                    <rect x="${xOffset}" y="${yValue}" width="${valueWidth}" height="50"
                          fill="url(#valueGradient)" filter="url(#shadow)" rx="4"/>
                    <text x="${xOffset + valueWidth/2}" y="${yValue + 30}"
                          text-anchor="middle" fill="white" font-size="12" font-weight="bold">
                        ${stage.valueTime}d
                    </text>
                </g>
            `;

            xOffset += valueWidth;
        }

        // Draw stage label and arrow
        svg += `
            <text x="${xOffset - (stage.wasteTime > 0 && stage.valueTime > 0 ? stage.wasteTime * pixelsPerDay + stage.valueTime * pixelsPerDay :
                                   stage.wasteTime > 0 ? stage.wasteTime * pixelsPerDay : valueWidth) / 2}"
                  y="${yWaste + 75}"
                  text-anchor="middle" font-size="14" font-weight="600" fill="#1e293b">
                ${stage.name}
            </text>
        `;

        // Draw arrow to next stage
        if (index < stages.length - 1) {
            const nextX = xOffset + 15;
            svg += `
                <path d="M ${nextX} ${yWaste + 25} L ${nextX + 15} ${yWaste + 25} L ${nextX + 10} ${yWaste + 20} M ${nextX + 15} ${yWaste + 25} L ${nextX + 10} ${yWaste + 30}"
                      stroke="#64748b" stroke-width="2" fill="none"/>
            `;
            xOffset += 30;
        }
    });

    // Add legend
    svg += `
        <g class="vsm-legend">
            <rect x="50" y="210" width="20" height="20" fill="url(#valueGradient)" rx="3"/>
            <text x="80" y="225" font-size="12" fill="#1e293b">Value-added time</text>

            <rect x="250" y="210" width="20" height="20" fill="url(#wasteGradient)" rx="3"/>
            <text x="280" y="225" font-size="12" fill="#1e293b">Waste (muda)</text>
        </g>
    `;

    // Add summary stats
    const totalValue = stages.reduce((sum, s) => sum + s.valueTime, 0);
    const totalWaste = stages.reduce((sum, s) => sum + s.wasteTime, 0);
    const ratio = Math.round((totalWaste / (totalValue + totalWaste)) * 100);

    svg += `
        <text x="550" y="225" font-size="14" font-weight="bold" fill="#1e293b">
            Lead Time: ${totalValue + totalWaste} days | Waste: ${ratio}%
        </text>
    `;

    svg += `
        </svg>
    `;

    return svg;
}

/**
 * Update VSM metrics display
 * @param {number} wastePercentage - Current waste percentage
 */
function updateVSMMetrics(wastePercentage) {
    const vsmRatioEl = document.getElementById('vsm-ratio-value');
    const vsmLeadTimeEl = document.getElementById('vsm-lead-time-value');
    const vsmValueTimeEl = document.getElementById('vsm-value-time-value');

    if (vsmRatioEl) {
        vsmRatioEl.textContent = `${wastePercentage}%`;

        // Color code based on waste level
        if (wastePercentage >= 80) {
            vsmRatioEl.className = 'vsm-metric-value critical';
        } else if (wastePercentage >= 50) {
            vsmRatioEl.className = 'vsm-metric-value warning';
        } else {
            vsmRatioEl.className = 'vsm-metric-value good';
        }
    }

    // Calculate sample lead time metrics
    const valueTime = Math.round(16 * (100 - wastePercentage) / 100); // 16 days max value time
    const wasteTime = Math.round(40 * wastePercentage / 100); // 40 days max waste time

    if (vsmLeadTimeEl) {
        vsmLeadTimeEl.textContent = `${valueTime + wasteTime} days`;
    }

    if (vsmValueTimeEl) {
        vsmValueTimeEl.textContent = `${valueTime} days`;
    }
}

/**
 * Update VSM legend with current status
 */
function updateVSMLegend() {
    // Add dynamic hints based on current waste level
    const vsmHints = document.getElementById('vsm-hints');

    if (vsmHints) {
        const hints = [
            '💡 Reduce wait times between stages',
            '🔄 Eliminate handoffs and approvals',
            '⚡ Automate manual processes',
            '📊 Batch similar work together',
            '🎯 Focus on finishing, not starting'
        ];

        vsmHints.innerHTML = hints.map(hint =>
            `<div class="vsm-hint-item">${hint}</div>`
        ).join('');
    }
}

/**
 * Initialize VSM section in DOM (call once on page load)
 * Should be called from main.js init() function
 */
export function initVSMSection() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.warn('main-content not found for VSM initialization');
        return;
    }

    // Check if VSM section already exists
    if (document.getElementById('vsm-section')) {
        return;
    }

    // Find velocity section to insert before it
    const velocitySection = document.getElementById('velocity-section');

    const vsmHTML = `
        <div id="vsm-section" class="vsm-section" style="display: none;">
            <div class="vsm-header">
                <h3>📊 Value Stream Map</h3>
                <div class="vsm-metrics">
                    <div class="vsm-metric">
                        <span class="vsm-metric-label">Waste Ratio:</span>
                        <span id="vsm-ratio-value" class="vsm-metric-value">90%</span>
                    </div>
                    <div class="vsm-metric">
                        <span class="vsm-metric-label">Lead Time:</span>
                        <span id="vsm-lead-time-value" class="vsm-metric-value">56 days</span>
                    </div>
                    <div class="vsm-metric">
                        <span class="vsm-metric-label">Value Time:</span>
                        <span id="vsm-value-time-value" class="vsm-metric-value">2 days</span>
                    </div>
                </div>
            </div>
            <div id="vsm-container" class="vsm-container">
                <!-- SVG will be rendered here -->
            </div>
            <div id="vsm-hints" class="vsm-hints">
                <!-- Improvement hints will appear here -->
            </div>
        </div>
    `;

    if (velocitySection) {
        velocitySection.insertAdjacentHTML('beforebegin', vsmHTML);
    } else {
        mainContent.insertAdjacentHTML('beforeend', vsmHTML);
    }
}

/**
 * Get VSM-specific level goals for Level 5
 * @returns {Array} Array of goal objects
 */
export function getVSMLevelGoals() {
    return [
        {
            id: 'vsm_reduce_waste',
            description: 'Reduce VSM waste ratio below 50%',
            target: 50,
            current: 90,
            icon: '🎯'
        },
        {
            id: 'vsm_automate',
            description: 'Automate 3 manual processes',
            target: 3,
            current: 0,
            icon: '⚡'
        }
    ];
}

/**
 * Simulate VSM improvement (for game mechanics)
 * @param {Object} state - Current game state
 * @param {string} action - Action taken ('automate', 'eliminate_handoff', etc.)
 * @returns {Object} Updated state or changes to apply
 */
export function simulateVSMImprovement(state, action) {
    let reduction = 0;

    switch(action) {
        case 'automate':
            reduction = 15;
            break;
        case 'eliminate_handoff':
            reduction = 10;
            break;
        case 'batch_work':
            reduction = 5;
            break;
        case 'continuous_flow':
            reduction = 20;
            break;
        default:
            reduction = 0;
    }

    // Apply reduction to vsm_ratio
    const newRatio = Math.max(10, state.vsm_ratio - reduction);

    return {
        vsm_ratio: newRatio,
        improvement: reduction
    };
}
