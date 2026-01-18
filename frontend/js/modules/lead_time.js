/**
 * Lead Time Module
 *
 * Calculates and displays lead time metrics for tasks.
 * Lead time = time from task creation to completion (in weeks).
 */

import { getState } from './state.js';

// Helper function for API calls
async function apiCall(endpoint) {
    const response = await fetch(`http://127.0.0.1:5001${endpoint}`);
    return await response.json();
}

// Cache for lead time data
let leadTimeCache = null;
let lastFetchWeek = 0;

/**
 * Fetch lead time metrics from the backend
 * @returns {Promise<Object>} Lead time metrics data
 */
export async function fetchLeadTimeMetrics() {
    const state = getState();
    if (!state) return null;

    // Use cache if we're still on the same week
    if (leadTimeCache && lastFetchWeek === state.week) {
        return leadTimeCache;
    }

    try {
        const data = await apiCall('/api/metrics/lead_time');
        leadTimeCache = data;
        lastFetchWeek = state.week;
        return data;
    } catch (error) {
        console.error('Failed to fetch lead time metrics:', error);
        return null;
    }
}

/**
 * Calculate lead time for a single task
 * @param {Object} task - Task object
 * @returns {number|null} Lead time in weeks, or null if not completed
 */
export function calculateTaskLeadTime(task) {
    if (!task.completed_week) return null;

    const createdWeek = task.created_week || 1;
    return task.completed_week - createdWeek;
}

/**
 * Get lead times for all completed tasks in state
 * @param {Object} state - Game state
 * @returns {Array} Array of objects with task info and lead time
 */
export function getAllLeadTimes(state) {
    const completedTasks = state.tasks?.done || [];
    const leadTimes = [];

    for (const task of completedTasks) {
        const leadTime = calculateTaskLeadTime(task);
        if (leadTime !== null) {
            leadTimes.push({
                task_id: task.id,
                title: task.title,
                type: task.type,
                points: task.points,
                lead_time: leadTime,
                created_week: task.created_week || 1,
                completed_week: task.completed_week
            });
        }
    }

    // Sort by completion week
    leadTimes.sort((a, b) => a.completed_week - b.completed_week);

    return leadTimes;
}

/**
 * Calculate average lead time
 * @param {Array} leadTimes - Array of lead time objects
 * @returns {number} Average lead time
 */
export function calculateAverageLeadTime(leadTimes) {
    if (!leadTimes || leadTimes.length === 0) return 0;

    const total = leadTimes.reduce((sum, lt) => sum + lt.lead_time, 0);
    return total / leadTimes.length;
}

/**
 * Get lead time trend data by week
 * @param {Array} leadTimes - Array of lead time objects
 * @returns {Array} Array of weekly averages
 */
export function getLeadTimeTrend(leadTimes) {
    if (!leadTimes || leadTimes.length === 0) return [];

    // Group by completion week
    const weeklyData = {};
    for (const lt of leadTimes) {
        const week = lt.completed_week;
        if (!weeklyData[week]) {
            weeklyData[week] = { total: 0, count: 0 };
        }
        weeklyData[week].total += lt.lead_time;
        weeklyData[week].count += 1;
    }

    // Convert to sorted array
    const trend = [];
    for (const week of Object.keys(weeklyData).sort((a, b) => a - b)) {
        const stats = weeklyData[week];
        trend.push({
            week: parseInt(week),
            avg_lead_time: stats.total / stats.count,
            count: stats.count
        });
    }

    return trend;
}

/**
 * Get throughput data (tasks completed per week)
 * @param {Object} state - Game state
 * @returns {Array} Array of weekly throughput
 */
export function getThroughputData(state) {
    const completedTasks = state.tasks?.done || [];

    if (!completedTasks || completedTasks.length === 0) return [];

    // Count tasks completed each week
    const weeklyCounts = {};
    for (const task of completedTasks) {
        if (task.completed_week) {
            const week = task.completed_week;
            weeklyCounts[week] = (weeklyCounts[week] || 0) + 1;
        }
    }

    // Convert to sorted array
    const throughput = [];
    for (const week of Object.keys(weeklyCounts).sort((a, b) => a - b)) {
        throughput.push({
            week: parseInt(week),
            completed: weeklyCounts[week]
        });
    }

    return throughput;
}

/**
 * Determine trend direction based on recent data points
 * @param {Array} trend - Lead time trend data
 * @returns {string} 'improving', 'stable', or 'degrading'
 */
export function determineTrendDirection(trend) {
    if (!trend || trend.length < 3) return 'stable';

    const recent = trend.slice(-3);
    const first = recent[0].avg_lead_time;
    const last = recent[recent.length - 1].avg_lead_time;

    // Consider change significant if it's more than 5%
    const percentChange = ((last - first) / first) * 100;

    if (percentChange < -5) return 'improving';
    if (percentChange > 5) return 'degrading';
    return 'stable';
}

/**
 * Get trend icon and color
 * @param {string} direction - Trend direction
 * @returns {Object} Object with icon and color
 */
export function getTrendStyle(direction) {
    const styles = {
        improving: { icon: '↓', color: '#22c55e', label: 'Improving' },
        stable: { icon: '→', color: '#eab308', label: 'Stable' },
        degrading: { icon: '↑', color: '#ef4444', label: 'Needs Attention' }
    };
    return styles[direction] || styles.stable;
}

/**
 * Render lead time chart using simple HTML/CSS bars
 * @param {string} containerId - Container element ID
 * @param {Array} trend - Lead time trend data
 */
export function renderLeadTimeChart(containerId, trend) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!trend || trend.length === 0) {
        container.innerHTML = '<div class="lead-time-empty">Complete tasks to see lead time trends</div>';
        return;
    }

    // Find max for scaling
    const maxLeadTime = Math.max(...trend.map(t => t.avg_lead_time));
    const maxWeek = trend[trend.length - 1].week;

    // Create chart
    let chartHtml = '<div class="lead-time-chart">';

    for (const data of trend) {
        const heightPercent = maxLeadTime > 0 ? (data.avg_lead_time / maxLeadTime) * 100 : 0;
        const barColor = data.avg_lead_time <= 3 ? '#22c55e' :
                        data.avg_lead_time <= 5 ? '#eab308' : '#ef4444';

        chartHtml += `
            <div class="lead-time-bar-group" title="Week ${data.week}: ${data.avg_lead_time.toFixed(1)} weeks avg (${data.count} tasks)">
                <div class="lead-time-bar" style="height: ${heightPercent}%; background-color: ${barColor};"></div>
                <div class="lead-time-label">W${data.week}</div>
                <div class="lead-time-value">${data.avg_lead_time.toFixed(1)}</div>
            </div>
        `;
    }

    chartHtml += '</div>';

    // Add legend
    chartHtml += `
        <div class="lead-time-legend">
            <div class="legend-item">
                <div class="legend-color" style="background-color: #22c55e;"></div>
                <span>Fast (≤3 weeks)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #eab308;"></div>
                <span>Moderate (4-5 weeks)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ef4444;"></div>
                <span>Slow (>5 weeks)</span>
            </div>
        </div>
    `;

    container.innerHTML = chartHtml;
}

/**
 * Render throughput chart
 * @param {string} containerId - Container element ID
 * @param {Array} throughput - Throughput data
 */
export function renderThroughputChart(containerId, throughput) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!throughput || throughput.length === 0) {
        container.innerHTML = '<div class="throughput-empty">Complete tasks to see throughput</div>';
        return;
    }

    // Find max for scaling
    const maxThroughput = Math.max(...throughput.map(t => t.completed));

    // Create chart
    let chartHtml = '<div class="throughput-chart">';

    for (const data of throughput) {
        const heightPercent = maxThroughput > 0 ? (data.completed / maxThroughput) * 80 : 0;

        chartHtml += `
            <div class="throughput-bar-group" title="Week ${data.week}: ${data.completed} tasks completed">
                <div class="throughput-bar" style="height: ${heightPercent}px;"></div>
                <div class="throughput-label">W${data.week}</div>
                <div class="throughput-value">${data.completed}</div>
            </div>
        `;
    }

    chartHtml += '</div>';
    container.innerHTML = chartHtml;
}

/**
 * Render lead time metrics summary
 * @param {string} containerId - Container element ID
 * @param {Object} metrics - Metrics summary object
 */
export function renderLeadTimeSummary(containerId, metrics) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!metrics || metrics.total_completed === 0) {
        container.innerHTML = '<p class="no-metrics">No completed tasks yet</p>';
        return;
    }

    const trendStyle = getTrendStyle(metrics.trend);

    let html = `
        <div class="lead-time-summary">
            <div class="metric-item">
                <div class="metric-label">Total Completed</div>
                <div class="metric-value">${metrics.total_completed}</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Avg Lead Time</div>
                <div class="metric-value">${metrics.avg_lead_time} <span class="metric-unit">weeks</span></div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Trend</div>
                <div class="metric-value trend-${metrics.trend}" style="color: ${trendStyle.color}">
                    ${trendStyle.icon} ${trendStyle.label}
                </div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Last Week Throughput</div>
                <div class="metric-value">${metrics.throughput_last_week} <span class="metric-unit">tasks</span></div>
            </div>
        </div>
    `;

    // Add breakdown by type if available
    if (metrics.lead_time_by_type && Object.keys(metrics.lead_time_by_type).length > 0) {
        html += '<div class="lead-time-by-type">';
        html += '<h4>By Task Type</h4>';

        for (const [type, stats] of Object.entries(metrics.lead_time_by_type)) {
            html += `
                <div class="type-metric">
                    <span class="type-name">${type}</span>
                    <span class="type-avg">${stats.avg.toFixed(1)} weeks</span>
                    <span class="type-count">(${stats.count} tasks)</span>
                </div>
            `;
        }

        html += '</div>';
    }

    container.innerHTML = html;
}

/**
 * Refresh lead time display
 * Fetches latest data and updates all charts
 */
export async function refreshLeadTimeDisplay() {
    const metrics = await fetchLeadTimeMetrics();
    if (!metrics) return;

    // Render summary
    renderLeadTimeSummary('lead-time-summary', metrics);

    // Render charts
    if (metrics.lead_time_trend) {
        renderLeadTimeChart('lead-time-chart', metrics.lead_time_trend);
    }

    if (metrics.throughput_history) {
        renderThroughputChart('throughput-chart', metrics.throughput_history);
    }
}

// Export all functions
export default {
    fetchLeadTimeMetrics,
    calculateTaskLeadTime,
    getAllLeadTimes,
    calculateAverageLeadTime,
    getLeadTimeTrend,
    getThroughputData,
    determineTrendDirection,
    getTrendStyle,
    renderLeadTimeChart,
    renderThroughputChart,
    renderLeadTimeSummary,
    refreshLeadTimeDisplay
};
