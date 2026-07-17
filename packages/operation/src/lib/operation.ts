import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { Subject } from '@event-driven-platform/subject';
import type { Brand } from '@event-driven-platform/types';

declare const operationResultType: unique symbol;

export interface Operation<
    TName extends string,
    TSchemaVersion extends number,
    TAggregateId extends Brand<string, string>,
    TPayload,
    TResult,
> {
    readonly name: TName;

    /**
     * Version of the serialized Operation contract.
     *
     * The combination of:
     *
     *   name + schemaVersion
     *
     * uniquely identifies the Operation schema.
     */
    readonly schemaVersion: TSchemaVersion;

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

export type AnyOperation = Operation<string, number, Brand<string, string>, unknown, unknown>;

export type OperationResultOf<TOperation extends AnyOperation> =
    TOperation extends Operation<
        infer _TName,
        infer _TSchemaVersion,
        infer _TAggregateId,
        infer _TPayload,
        infer TResult
    >
        ? TResult
        : never;
