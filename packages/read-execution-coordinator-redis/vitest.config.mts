import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/read-execution-coordinator-redis',
    test: {
        name: '@event-driven-platform/read-execution-coordinator-redis',
        watch: false,
        globals: true,
        environment: 'node',
        include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['**/*.integration.spec.ts'],
        passWithNoTests: true,
        reporters: ['default'],
        coverage: {
            reportsDirectory: './test-output/vitest/coverage',
            provider: 'v8' as const,
        },
    },
}));
