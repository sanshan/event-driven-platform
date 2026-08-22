import { describe, expectTypeOf, it } from 'vitest';

import type { Intent } from '@event-driven-platform/intent';

import type { UseCase, UseCaseContext } from '../index.js';

interface CreateOrderInput {
    readonly orderId: string;
}

interface CreateOrderResult {
    readonly accepted: boolean;
}

describe('UseCase', () => {
    it('binds input, result and invocation context types', () => {
        type Contract = UseCase<CreateOrderInput, CreateOrderResult>;
        type ExecuteParameters = Parameters<Contract['execute']>;
        type ExecuteResult = Awaited<ReturnType<Contract['execute']>>;

        expectTypeOf<ExecuteParameters[0]>().toEqualTypeOf<CreateOrderInput>();
        expectTypeOf<ExecuteParameters[1]>().toEqualTypeOf<UseCaseContext>();
        expectTypeOf<ExecuteResult>().toEqualTypeOf<CreateOrderResult>();
        expectTypeOf<UseCaseContext['intent']>().toEqualTypeOf<Intent>();
        expectTypeOf<UseCaseContext['correlationId']>().toEqualTypeOf<string>();
    });
});
