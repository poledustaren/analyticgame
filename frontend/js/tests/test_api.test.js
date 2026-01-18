/**
 * Unit tests for api.js module
 *
 * Тестирует API взаимодействие с бэкендом
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Мок для fetch
global.fetch = vi.fn();

describe('API Module', () => {
    beforeEach(() => {
        fetch.mockClear();
        // Базовый URL API
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Game State API', () => {
        it('should fetch game state', async () => {
            const mockState = {
                level: 1,
                week: 1,
                budget: 500000,
                stability: 80
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockState,
            });

            const API = await import('../modules/api.js');
            const state = await API.getState();

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/state'),
                expect.any(Object)
            );
            expect(state).toEqual(mockState);
        });

        it('should handle fetch error gracefully', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const API = await import('../modules/api.js');

            // Должен выбросить ошибку или вернуть null в зависимости от реализации
            await expect(API.getState()).rejects.toThrow();
        });
    });

    describe('Task Actions', () => {
        it('should move task to column', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

            const API = await import('../modules/api.js');

            await API.moveTask('task-123', 'in_progress');

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/move'),
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('should assign resource to task', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

            const API = await import('../modules/api.js');

            await API.assignResource('task-123', 'brent');

            const fetchArgs = fetch.mock.calls[0];
            expect(JSON.parse(fetchArgs[1].body)).toEqual({
                task_id: 'task-123',
                resource_id: 'brent'
            });
        });
    });

    describe('Sprint Actions', () => {
        it('should create sprint', async () => {
            const mockSprint = {
                id: 1,
                goal: 'Test sprint',
                duration_weeks: 2,
                task_ids: ['task-1', 'task-2']
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockSprint,
            });

            const API = await import('../modules/api.js');

            const sprint = await API.createSprint(['task-1', 'task-2'], 'Test sprint', 2);

            expect(sprint).toEqual(mockSprint);
        });

        it('should start sprint', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, phase: 'active' }),
            });

            const API = await import('../modules/api.js');

            const result = await API.startSprint(1);

            expect(result.phase).toBe('active');
        });
    });

    describe('Training Actions', () => {
        it('should start training', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    training_complete: false,
                    weeks_remaining: 3
                }),
            });

            const API = await import('../modules/api.js');

            const result = await API.startTraining('brent');

            expect(result.training_complete).toBe(false);
            expect(result.weeks_remaining).toBe(3);
        });
    });

    describe('Save/Load', () => {
        it('should save game', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, slot: 1 }),
            });

            const API = await import('../modules/api.js');

            const result = await API.saveGame(1);

            expect(result.slot).toBe(1);
        });

        it('should load game', async () => {
            const mockSave = {
                level: 2,
                week: 5,
                budget: 450000,
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockSave,
            });

            const API = await import('../modules/api.js');

            const save = await API.loadGame(1);

            expect(save).toEqual(mockSave);
        });

        it('should list save slots', async () => {
            const mockSlots = [
                { slot: 1, level: 1, week: 3, date: '2025-01-15' },
                { slot: 2, level: 2, week: 7, date: '2025-01-16' },
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ slots: mockSlots }),
            });

            const API = await import('../modules/api.js');

            const result = await API.listSaves();

            expect(result.slots).toHaveLength(2);
        });
    });
});
