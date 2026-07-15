import type { Actor } from '@event-driven-platform/actor';

declare const readResultType: unique symbol;

export interface Read<TName extends string, TParameters, TResult> {
    readonly name: TName;

    readonly actor: Actor;

    readonly parameters: TParameters;

    /**
     * Type-only marker.
     *
     * Associates a Read with its result type without adding
     * runtime data to the Read object.
     */
    readonly [readResultType]?: TResult;
}

export type AnyRead = Read<string, unknown, unknown>;

export type ReadResultOf<TRead extends AnyRead> =
    TRead extends Read<infer _TName, infer _TParameters, infer TResult> ? TResult : never;
