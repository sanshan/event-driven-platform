import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/reader-integration',
    test: {
        name: '@event-driven-platform/reader:integration',
        watch: false,
        globals: true,
        environment: 'node',
        include: ['src/**/*.integration.spec.ts'],
        reporters: ['default'],
    },
}));
