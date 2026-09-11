import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/event-schema-protobuf',
    test: {
        name: '@event-driven-platform/event-schema-protobuf',
        watch: false,
        globals: true,
        environment: 'node',
        include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        reporters: ['default'],
        coverage: {
            reportsDirectory: './test-output/vitest/coverage',
            provider: 'v8' as const,
        },
    },
}));
