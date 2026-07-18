import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    DefaultExecutionAttemptIdFactory,
    type ExecutionAttemptId,
    type ExecutionId,
} from '../index.js';

describe('DefaultExecutionAttemptIdFactory', () => {
    it('creates a deterministic ExecutionAttemptId', () => {
        const factory = new DefaultExecutionAttemptIdFactory();

        const executionId = 'execution-1' as ExecutionId;

        const first = factory.create({
            executionId,
            attemptNumber: 1,
        });

        const second = factory.create({
            executionId,
            attemptNumber: 1,
        });

        expect(first).toBe(second);

        expectTypeOf(first).toEqualTypeOf<ExecutionAttemptId>();
    });

    it('creates different identifiers for different attempts', () => {
        const factory = new DefaultExecutionAttemptIdFactory();

        const executionId = 'execution-1' as ExecutionId;

        const first = factory.create({
            executionId,
            attemptNumber: 1,
        });

        const second = factory.create({
            executionId,
            attemptNumber: 2,
        });

        expect(first).not.toBe(second);
    });

    it('creates different identifiers for different executions', () => {
        const factory = new DefaultExecutionAttemptIdFactory();

        const first = factory.create({
            executionId: 'execution-1' as ExecutionId,
            attemptNumber: 1,
        });

        const second = factory.create({
            executionId: 'execution-2' as ExecutionId,
            attemptNumber: 1,
        });

        expect(first).not.toBe(second);
    });

    it('rejects a non-positive attempt number', () => {
        const factory = new DefaultExecutionAttemptIdFactory();

        expect(() =>
            factory.create({
                executionId: 'execution-1' as ExecutionId,
                attemptNumber: 0,
            }),
        ).toThrow();
    });

    it('rejects a non-integer attempt number', () => {
        const factory = new DefaultExecutionAttemptIdFactory();

        expect(() =>
            factory.create({
                executionId: 'execution-1' as ExecutionId,
                attemptNumber: 1.5,
            }),
        ).toThrow();
    });
});
