/**
 * Vitest configuration for frontend tests
 *
 * Запуск: npx vitest
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.js'],
        include: ['**/*.test.js'],
        exclude: ['node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'tests/**',
            ],
        },
    },
    resolve: {
        alias: {
            '@': new URL('./modules', import.meta.url).pathname,
        },
    },
});
