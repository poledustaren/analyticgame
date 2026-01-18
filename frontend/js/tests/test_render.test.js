/**
 * Unit tests for render.js module
 *
 * Тестирует функции рендеринга UI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup JSDOM for DOM testing
const dom = new JSDOM(`<!DOCTYPE html>
<html>
<head></head>
<body>
    <div id="app-layout">
        <div id="wip-limit">0</div>
        <div id="wip-current">0</div>
        <div class="wip-badge">WIP: 0/0</div>
        <div id="resource-pool"></div>
        <div id="sprint-status"></div>
        <div id="sprint-phases-bar"></div>
        <div id="sprint-goal-text">-</div>
        <div id="backlog" data-column-id="backlog"><div class="task-list"></div><span class="count">0</span></div>
        <div id="in_progress" data-column-id="in_progress"><div class="task-list"></div><span class="count">0</span></div>
        <div id="review" data-column-id="review"><div class="task-list"></div><span class="count">0</span></div>
        <div id="done" data-column-id="done"><div class="task-list"></div><span class="count">0</span></div>
        <div class="phase" data-phase="planning"></div>
        <div class="phase" data-phase="active"></div>
        <div class="phase" data-phase="review"></div>
        <div class="phase" data-phase="retro"></div>
    </div>
</body>
</html>`);

global.window = dom.window;
global.document = dom.window.document;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;

// Mock the imported modules
vi.mock('../modules/bus_factor.js', () => ({
    renderBusFactor: vi.fn(),
}));

vi.mock('../modules/knowledge.js', () => ({
    renderKnowledge: vi.fn(),
    checkKnowledgeAchievements: vi.fn(),
}));

vi.mock('../modules/vsm.js', () => ({
    renderVSM: vi.fn(),
}));

vi.mock('../modules/lead_time.js', () => ({
    renderLeadTimeSummary: vi.fn(),
    renderLeadTimeChart: vi.fn(),
    renderThroughputChart: vi.fn(),
    refreshLeadTimeDisplay: vi.fn(),
}));

describe('Render Module', () => {
    let renderModule;

    beforeEach(async () => {
        vi.clearAllMocks();
        // Import module to ensure fresh state for each test
        renderModule = await import('../modules/render.js');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('renderBoard', () => {
        it('should render tasks to columns', () => {
            const tasks = {
                backlog: [
                    { id: 'task-1', title: 'Task 1', type: 'business', points: 5, description: 'Test task' }
                ],
                in_progress: [],
                review: [],
                done: []
            };
            const currentState = { resources: [] };
            const limit = 3;

            renderModule.renderBoard(tasks, limit, currentState, null);

            // Check WIP display
            expect(document.getElementById('wip-limit').textContent).toBe('3');
            expect(document.getElementById('wip-current').textContent).toBe('0');

            // Check backlog column
            const backlogList = document.querySelector('#backlog .task-list');
            expect(backlogList.children.length).toBe(1);
            expect(backlogList.children[0].classList.contains('type-business')).toBe(true);
        });

        it('should add warning class when WIP limit is reached', () => {
            const tasks = {
                backlog: [],
                in_progress: [
                    { id: 'task-1', title: 'Task 1', type: 'business', points: 5 },
                    { id: 'task-2', title: 'Task 2', type: 'business', points: 3 },
                    { id: 'task-3', title: 'Task 3', type: 'business', points: 2 }
                ],
                review: [],
                done: []
            };
            const currentState = { resources: [] };
            const limit = 3;

            renderModule.renderBoard(tasks, limit, currentState, null);

            const wipBadge = document.querySelector('.wip-badge');
            expect(wipBadge.classList.contains('warning')).toBe(true);
        });

        it('should add critical class when WIP limit is exceeded', () => {
            const tasks = {
                backlog: [],
                in_progress: [
                    { id: 'task-1', title: 'Task 1', type: 'business', points: 5 },
                    { id: 'task-2', title: 'Task 2', type: 'business', points: 3 },
                    { id: 'task-3', title: 'Task 3', type: 'business', points: 2 },
                    { id: 'task-4', title: 'Task 4', type: 'business', points: 1 }
                ],
                review: [],
                done: []
            };
            const currentState = { resources: [] };
            const limit = 3;

            renderModule.renderBoard(tasks, limit, currentState, null);

            const wipBadge = document.querySelector('.wip-badge');
            expect(wipBadge.classList.contains('critical')).toBe(true);
        });

        it('should render resource slot for tasks requiring Brent', () => {
            const tasks = {
                backlog: [
                    {
                        id: 'task-1',
                        title: 'Task 1',
                        type: 'unplanned',
                        points: 8,
                        required_resource: 'brent',
                        assigned_resource: null,
                        description: 'Needs Brent'
                    }
                ],
                in_progress: [],
                review: [],
                done: []
            };
            const currentState = {
                resources: [
                    { id: 'brent', name: 'Brent', role: 'Lead Engineer' }
                ]
            };

            renderModule.renderBoard(tasks, 5, currentState, null);

            const backlogList = document.querySelector('#backlog .task-list');
            const card = backlogList.children[0];
            expect(card.classList.contains('resource-drop-target')).toBe(true);
            expect(card.innerHTML).toContain('NEEDS BRENT');
        });

        it('should show assigned resource when task is assigned', () => {
            const tasks = {
                backlog: [
                    {
                        id: 'task-1',
                        title: 'Task 1',
                        type: 'unplanned',
                        points: 8,
                        required_resource: 'brent',
                        assigned_resource: 'brent',
                        description: 'Brent assigned'
                    }
                ],
                in_progress: [],
                review: [],
                done: []
            };
            const currentState = {
                resources: [
                    { id: 'brent', name: 'Brent', role: 'Lead Engineer' }
                ]
            };

            renderModule.renderBoard(tasks, 5, currentState, null);

            const backlogList = document.querySelector('#backlog .task-list');
            const card = backlogList.children[0];
            expect(card.innerHTML).toContain('Assigned: Brent');
        });

        it('should show sprint badge for tasks in current sprint', () => {
            const tasks = {
                backlog: [
                    { id: 'task-1', title: 'Sprint Task', type: 'business', points: 5 }
                ],
                in_progress: [],
                review: [],
                done: []
            };
            const currentState = {
                resources: [],
                current_sprint: {
                    task_ids: ['task-1']
                }
            };

            renderModule.renderBoard(tasks, 5, currentState, null);

            const backlogList = document.querySelector('#backlog .task-list');
            const card = backlogList.children[0];
            expect(card.innerHTML).toContain('SPRINT');
        });

        it('should update column counts', () => {
            const tasks = {
                backlog: [
                    { id: 'task-1', title: 'Task 1', type: 'business', points: 5 },
                    { id: 'task-2', title: 'Task 2', type: 'business', points: 3 }
                ],
                in_progress: [{ id: 'task-3', title: 'Task 3', type: 'internal', points: 2 }],
                review: [],
                done: [{ id: 'task-4', title: 'Task 4', type: 'business', points: 8 }]
            };

            renderModule.renderBoard(tasks, 5, { resources: [] }, null);

            expect(document.querySelector('#backlog .count').textContent).toBe('2');
            expect(document.querySelector('#in_progress .count').textContent).toBe('1');
            expect(document.querySelector('#review .count').textContent).toBe('0');
            expect(document.querySelector('#done .count').textContent).toBe('1');
        });
    });

    describe('renderResources', () => {
        it('should render available resources in pool', () => {
            const resources = [
                { id: 'dev1', name: 'Developer 1', role: 'Engineer', busy_task_id: null },
                { id: 'dev2', name: 'Developer 2', role: 'QA', busy_task_id: null }
            ];

            renderModule.renderResources(resources);

            const pool = document.getElementById('resource-pool');
            expect(pool.children.length).toBe(2);
        });

        it('should not render busy resources', () => {
            const resources = [
                { id: 'dev1', name: 'Developer 1', role: 'Engineer', busy_task_id: null },
                { id: 'dev2', name: 'Developer 2', role: 'QA', busy_task_id: 'task-1' },
                { id: 'dev3', name: 'Developer 3', role: 'DevOps', busy_task_id: 'task-2' }
            ];

            renderModule.renderResources(resources);

            const pool = document.getElementById('resource-pool');
            expect(pool.children.length).toBe(1);
        });

        it('should show empty pool when all resources are busy', () => {
            const resources = [
                { id: 'dev1', name: 'Developer 1', role: 'Engineer', busy_task_id: 'task-1' },
                { id: 'dev2', name: 'Developer 2', role: 'QA', busy_task_id: 'task-2' }
            ];

            renderModule.renderResources(resources);

            const pool = document.getElementById('resource-pool');
            expect(pool.children.length).toBe(0);
        });
    });

    describe('createAvatarElement', () => {
        it('should create avatar with correct properties', () => {
            const resource = {
                id: 'brent',
                name: 'Brent',
                role: 'Lead Engineer'
            };

            const avatar = renderModule.createAvatarElement(resource);

            expect(avatar.className).toBe('resource-avatar');
            expect(avatar.draggable).toBe(true);
            expect(avatar.textContent).toBe('B');
            expect(avatar.dataset.resourceId).toBe('brent');
            expect(avatar.title).toBe('Brent (Lead Engineer)');
        });

        it('should show first letter of multi-word name', () => {
            const resource = {
                id: 'dev1',
                name: 'John Doe',
                role: 'Developer'
            };

            const avatar = renderModule.createAvatarElement(resource);

            expect(avatar.textContent).toBe('J');
        });
    });

    describe('renderSprintPanel', () => {
        let mockSprintBtn;
        let mockShowReviewModal;

        beforeEach(() => {
            mockSprintBtn = {
                textContent: '',
                className: ''
            };
            mockShowReviewModal = vi.fn();
        });

        it('should show no sprint message when no active sprint', () => {
            const state = {
                current_sprint: null
            };

            renderModule.renderSprintPanel(state, mockSprintBtn, mockShowReviewModal);

            const sprintStatus = document.getElementById('sprint-status');
            expect(sprintStatus.innerHTML).toContain('No active sprint');
            expect(mockSprintBtn.textContent).toBe('Start Sprint');
        });

        it('should hide phases bar when no active sprint', () => {
            const state = {
                current_sprint: null
            };

            renderModule.renderSprintPanel(state, mockSprintBtn, mockShowReviewModal);

            const phasesBar = document.getElementById('sprint-phases-bar');
            expect(phasesBar.style.display).toBe('none');
        });

        it('should show sprint info when sprint is active', () => {
            const state = {
                current_sprint: {
                    id: 1,
                    goal: 'Test Sprint',
                    phase: 'active',
                    planned_velocity: 20,
                    current_week: 1,
                    duration_weeks: 2
                }
            };

            renderModule.renderSprintPanel(state, mockSprintBtn, mockShowReviewModal);

            const sprintStatus = document.getElementById('sprint-status');
            expect(sprintStatus.innerHTML).toContain('Sprint 1');
            expect(sprintStatus.innerHTML).toContain('Test Sprint');
            expect(sprintStatus.innerHTML).toContain('Planned: 20 pts');

            const phasesBar = document.getElementById('sprint-phases-bar');
            expect(phasesBar.style.display).toBe('flex');
        });

        it('should mark correct phase as active', () => {
            const state = {
                current_sprint: {
                    id: 1,
                    goal: 'Test',
                    phase: 'review'
                }
            };

            renderModule.renderSprintPanel(state, mockSprintBtn, mockShowReviewModal);

            const phases = document.querySelectorAll('.phase');
            expect(phases[0].classList.contains('completed')).toBe(true); // planning
            expect(phases[1].classList.contains('completed')).toBe(true); // active
            expect(phases[2].classList.contains('active')).toBe(true); // review
            expect(phases[3].classList.contains('active')).toBe(false); // retro
        });

        it('should display phase emoji correctly', () => {
            const phases = ['planning', 'active', 'review', 'retro'];
            const emojis = ['📋', '🚀', '👀', '💡'];

            phases.forEach((phase, index) => {
                const state = {
                    current_sprint: {
                        id: 1,
                        goal: 'Test',
                        phase: phase
                    }
                };

                renderModule.renderSprintPanel(state, mockSprintBtn, mockShowReviewModal);

                const sprintStatus = document.getElementById('sprint-status');
                expect(sprintStatus.innerHTML).toContain(emojis[index]);
            });
        });
    });

    describe('Wrapper Functions', () => {
        it('renderBusFactor should call bus_factor module', async () => {
            const { renderBusFactor } = await import('../modules/bus_factor.js');
            const state = { bus_factor: 3 };

            renderModule.renderBusFactor(state);

            expect(renderBusFactor).toHaveBeenCalledWith(state);
        });

        it('renderKnowledge should call knowledge module', async () => {
            const { renderKnowledge } = await import('../modules/knowledge.js');
            const state = { knowledge: 50 };

            renderModule.renderKnowledge(state);

            expect(renderKnowledge).toHaveBeenCalledWith(state);
        });

        it('checkKnowledgeAchievements should call knowledge module', async () => {
            const { checkKnowledgeAchievements } = await import('../modules/knowledge.js');
            const state = { knowledge: 100 };
            const earnedAchievements = new Set();
            const addAchievement = vi.fn();

            renderModule.checkKnowledgeAchievements(state, earnedAchievements, addAchievement);

            expect(checkKnowledgeAchievements).toHaveBeenCalledWith(state, earnedAchievements, addAchievement);
        });

        it('renderValueStreamMap should call VSM module', async () => {
            const { renderVSM } = await import('../modules/vsm.js');
            const state = { level: 3 };

            renderModule.renderValueStreamMap(state);

            expect(renderVSM).toHaveBeenCalledWith(state);
        });
    });
});
