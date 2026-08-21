import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/reader-verification',
    test: {
        name: '@event-driven-platform/reader:verification',
        watch: false,
        globals: true,
        environment: 'node',
        include: ['src/**/*.verification.spec.ts'],
        reporters: ['default'],
        testTimeout: 15_000,
        hookTimeout: 15_000,
    },
}));
