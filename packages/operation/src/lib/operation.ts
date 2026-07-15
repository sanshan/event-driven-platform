import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { Subject } from '@event-driven-platform/subject';
import type { Brand } from '@event-driven-platform/types';

declare const operationResultType: unique symbol;

export interface Operation<
    TName extends string,
    TAggregateId extends Brand<string, string>,
    TPayload,
    TResult,
> {
    readonly name: TName;

    readonly intent: Intent;

    readonly actor: Actor;
    readonly subject: Subject;

    readonly aggregateId: TAggregateId;

    readonly payload: TPayload;

    /**
     * Type-only marker.
     *
     * Associates an Operation with its result type without adding
     * runtime data to the Operation object.
     */
    readonly [operationResultType]?: TResult;
}

export type AnyOperation = Operation<string, Brand<string, string>, unknown, unknown>;

export type OperationResultOf<TOperation extends AnyOperation> =
    TOperation extends Operation<infer _TName, infer _TAggregateId, infer _TPayload, infer TResult>
        ? TResult
        : never;
