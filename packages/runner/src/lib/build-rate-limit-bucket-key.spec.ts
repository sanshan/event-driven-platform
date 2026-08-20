import { describe, expect, it } from 'vitest';

import type { CommandOptions } from '@event-driven-platform/command';

import { operation } from '../../test/runner-test-kit.js';
import { buildRateLimitBucketKey } from './rate-limit/build-rate-limit-bucket-key.js';

type ConfiguredRateLimit = NonNullable<CommandOptions['rateLimit']>;

function rateLimit(scope: ConfiguredRateLimit['scope']): ConfiguredRateLimit {
    return {
        key: 'wallet|create',
        scope,
        limit: 10,
        windowMs: 60_000,
    };
}

describe('buildRateLimitBucketKey', () => {
    it('builds a global bucket without operation-specific identity', () => {
        expect(buildRateLimitBucketKey(rateLimit('global'), operation)).toBe(
            'wallet%7Ccreate|global',
        );
    });

    it('builds an actor-scoped bucket', () => {
        expect(buildRateLimitBucketKey(rateLimit('actor'), operation)).toBe(
            'wallet%7Ccreate|actor|user|user-1',
        );
    });

    it('builds a tenant-scoped bucket', () => {
        expect(buildRateLimitBucketKey(rateLimit('tenant'), operation)).toBe(
            'wallet%7Ccreate|tenant|merchant|merchant-1',
        );
    });

    it('builds a subject-scoped bucket', () => {
        expect(buildRateLimitBucketKey(rateLimit('subject'), operation)).toBe(
            'wallet%7Ccreate|subject|user|user-1',
        );
    });

    it('builds an operation-scoped bucket including schema version', () => {
        expect(buildRateLimitBucketKey(rateLimit('operation'), operation)).toBe(
            'wallet%7Ccreate|operation|CreateWallet|1',
        );
    });
});
