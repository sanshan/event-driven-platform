import { describe, expect, expectTypeOf, it } from 'vitest';

import { DefaultExecutionIdFactory, type ExecutionId } from '../index.js';

describe('DefaultExecutionIdFactory', () => {
    it('creates a deterministic ExecutionId', () => {
        const factory = new DefaultExecutionIdFactory();

        const first = factory.create('intent-1');
        const second = factory.create('intent-1');

        expect(first).toBe(second);

        expectTypeOf(first).toEqualTypeOf<ExecutionId>();
    });

    it('creates different identifiers for different Intents', () => {
        const factory = new DefaultExecutionIdFactory();

        const first = factory.create('intent-1');
        const second = factory.create('intent-2');

        expect(first).not.toBe(second);
    });

    it('rejects an empty Intent identifier', () => {
        const factory = new DefaultExecutionIdFactory();

        expect(() => factory.create('')).toThrow();
    });

    it('rejects surrounding whitespace', () => {
        const factory = new DefaultExecutionIdFactory();

        expect(() => factory.create(' intent-1')).toThrow();
    });
});
