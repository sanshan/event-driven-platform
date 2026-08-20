import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tools/package-verification/verify-local-registry.spec.ts'],
        globalSetup: ['tools/start-local-registry.ts'],
        testTimeout: 120_000,
    },
});
