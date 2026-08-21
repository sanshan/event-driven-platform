import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/read-cache-redis-integration',
    test: {
        name: '@event-driven-platform/read-cache-redis:integration',
        watch: false,
        globals: true,
        environment: 'node',
        include: ['src/**/*.integration.spec.ts'],
        reporters: ['default'],
    },
}));
