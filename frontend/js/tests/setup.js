/**
 * Test setup file for Vitest
 *
 * Глобальные моки и настройки для всех тестов
 */

import { vi } from 'vitest';

// Мок для localStorage
const localStorageMock = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = String(value);
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    },
    get length() {
        return Object.keys(this.store).length;
    },
    key(index) {
        return Object.keys(this.store)[index] || null;
    }
};

global.localStorage = localStorageMock;

// Мок для sessionStorage
global.sessionStorage = localStorageMock;

// Мок для window.alert
global.alert = vi.fn();

// Мок для window.confirm
global.confirm = vi.fn(() => true);

// Мок для Audio API (для звуковой системы)
global.Audio = vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
}));

// Мок для requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
