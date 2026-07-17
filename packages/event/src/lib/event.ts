export interface Event<TName extends string, TSchemaVersion extends number, TPayload> {
    readonly name: TName;

    readonly schemaVersion: TSchemaVersion;

    readonly payload: TPayload;
}

export type AnyEvent = Event<string, number, unknown>;
