import type { AnyAggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { OperationResult } from '@event-driven-platform/operation-result';
import type { Subject } from '@event-driven-platform/subject';
import type { AnyTenantReference } from '@event-driven-platform/tenant-reference';

declare const operationResultType: unique symbol;

export interface Operation<
    TName extends string,
    TSchemaVersion extends number,
    TTenant extends AnyTenantReference,
    TAggregate extends AnyAggregateReference,
    TPayload,
    TResult extends OperationResult,
> {
    readonly name: TName;

    readonly schemaVersion: TSchemaVersion;

    readonly intent: Intent;

    readonly actor: Actor;

    readonly tenant: TTenant;

    readonly subject: Subject;

    readonly aggregate: TAggregate;

    readonly payload: TPayload;

    readonly [operationResultType]?: TResult;
}

export type AnyOperation = Operation<
    string,
    number,
    AnyTenantReference,
    AnyAggregateReference,
    unknown,
    OperationResult
>;

export type OperationResultOf<TOperation extends AnyOperation> =
    TOperation extends Operation<
        infer _TName,
        infer _TSchemaVersion,
        infer _TTenant,
        infer _TAggregate,
        infer _TPayload,
        infer TResult
    >
        ? TResult
        : never;
