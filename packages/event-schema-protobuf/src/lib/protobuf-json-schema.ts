import { failProtobuf, type ProtobufRenderContext } from './protobuf-render-context.js';

export type JsonObject = Record<string, unknown>;

export function assertOnlyJsonSchemaKeys(
    schema: JsonObject,
    allowedKeys: readonly string[],
    path: readonly string[],
    context: ProtobufRenderContext,
    allowRootDialect = false,
): void {
    const allowed = new Set(allowedKeys);

    for (const key of Object.keys(schema)) {
        if (allowed.has(key) || (allowRootDialect && key === '$schema')) {
            continue;
        }

        failProtobuf(path, context, `unsupported normalized schema keyword "${key}"`);
    }
}

export function expectJsonObject(
    value: unknown,
    path: readonly string[],
    context: ProtobufRenderContext,
    label = 'schema',
): JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        failProtobuf(path, context, `${label} must be an object`);
    }

    return value as JsonObject;
}

export function readJsonSchemaStringArray(
    value: unknown,
    path: readonly string[],
    context: ProtobufRenderContext,
    label: string,
): string[] {
    if (!Array.isArray(value) || !value.every((entry): entry is string => typeof entry === 'string')) {
        failProtobuf(path, context, `${label} must be a string array`);
    }

    return value;
}

export function isPlainNullJsonSchema(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length === 1 &&
        (value as JsonObject).type === 'null'
    );
}

export function describeJsonSchemaValue(value: unknown): string {
    return JSON.stringify(value) ?? String(value);
}
