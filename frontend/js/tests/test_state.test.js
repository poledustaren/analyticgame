/**
 * Unit tests for state.js module
 *
 * Тестирует управление состоянием приложения
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Моки для DOM (для тестов state не нужен полный DOM)
global.localStorage = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = value;
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

describe('State Module', () => {
    beforeEach(() => {
        // Очищаем состояние перед каждым тестом
        localStorage.clear();
        // Импортируем модуль после очистки
        vi.resetModules();
    });

    describe('State Management', () => {
        it('should get initial state', async () => {
            const { getState } = await import('../modules/state.js');
            const state = getState();

            expect(state).toBeDefined();
            expect(typeof state).toBe('object');
        });

        it('should set state value', async () => {
            const { setState, getState } = await import('../modules/state.js');

            setState('testKey', 'testValue');
            expect(getState('testKey')).toBe('testValue');
        });

        it('should update nested state', async () => {
            const { updateState, getState } = await import('../modules/state.js');

            updateState('nested', { key: 'value' });
            expect(getState('nested')).toEqual({ key: 'value' });
        });

        it('should reset all state', async () => {
            const { setState, resetAllState, getState } = await import('../modules/state.js');

            setState('key1', 'value1');
            setState('key2', 'value2');

            resetAllState();

            expect(getState('key1')).toBeUndefined();
            expect(getState('key2')).toBeUndefined();
        });
    });

    describe('Sprint Planning State', () => {
        it('should manage planning sprint tasks', async () => {
            const {
                getPlanningSprintTasks,
                setPlanningSprintTasks,
                addPlanningSprintTask,
                removePlanningSprintTask
            } = await import('../modules/state.js');

            const tasks = ['task-1', 'task-2'];
            setPlanningSprintTasks(tasks);

            expect(getPlanningSprintTasks()).toEqual(tasks);

            addPlanningSprintTask('task-3');
            expect(getPlanningSprintTasks()).toHaveLength(3);

            removePlanningSprintTask('task-1');
            expect(getPlanningSprintTasks()).toHaveLength(2);
        });
    });

    describe('Achievements', () => {
        it('should manage achievements', async () => {
            const {
                hasAchievement,
                addAchievement,
                getAchievements,
                resetAchievements
            } = await import('../modules/state.js');

            expect(hasAchievement('first-task')).toBe(false);

            addAchievement('first-task');
            expect(hasAchievement('first-task')).toBe(true);

            const achievements = getAchievements();
            expect(achievements).toContain('first-task');

            resetAchievements();
            expect(hasAchievement('first-task')).toBe(false);
        });
    });

    describe('Planning Poker State', () => {
        it('should manage poker state', async () => {
            const {
                getPokerTask,
                setPokerTask,
                getPokerValue,
                setPokerValue,
                getTeamEstimates,
                setTeamEstimates,
                addTeamEstimate,
                resetPokerState
            } = await import('../modules/state.js');

            setPokerTask('task-123');
            expect(getPokerTask()).toBe('task-123');

            setPokerValue(5);
            expect(getPokerValue()).toBe(5);

            setTeamEstimates([]);
            addTeamEstimate('erik', 3);
            addTeamEstimate('steve', 5);

            const estimates = getTeamEstimates();
            expect(estimates).toHaveLength(2);
            expect(estimates[0]).toEqual({ name: 'erik', value: 3 });

            resetPokerState();
            expect(getPokerTask()).toBeNull();
            expect(getPokerValue()).toBeNull();
        });
    });
});
