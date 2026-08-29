import type { Actor } from '@event-driven-platform/actor';
import type { AnyTenantReference } from '@event-driven-platform/tenant-reference';

declare const readResultType: unique symbol;

export interface Read<
    TName extends string,
    TTenant extends AnyTenantReference,
    TParameters,
    TResult,
> {
    readonly name: TName;

    readonly actor: Actor;

    readonly tenant: TTenant;

    readonly parameters: TParameters;

    /**
     * Type-only marker.
     *
     * Associates a Read with its result type without adding
     * runtime data to the Read object.
     */
    readonly [readResultType]?: TResult;
}

export type AnyRead = Read<string, AnyTenantReference, unknown, unknown>;

export type ReadResultOf<TRead extends AnyRead> =
    TRead extends Read<infer _TName, infer _TTenant, infer _TParameters, infer TResult>
        ? TResult
        : never;
