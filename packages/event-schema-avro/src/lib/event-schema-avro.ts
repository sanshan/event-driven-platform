import type { EventContract } from '@event-driven-platform/event';
import { z } from 'zod';

const AVRO_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const AVRO_PRIMITIVE_NAMES = new Set([
    'null',
    'boolean',
    'int',
    'long',
    'float',
    'double',
    'bytes',
    'string',
]);
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

type JsonObject = Record<string, unknown>;

export interface AvroRenderOptions {
    readonly recordName: string;
    readonly namespace?: string;
}

export interface AvroField {
    readonly name: string;
    readonly type: AvroSchema;
}

export interface AvroRecordSchema {
    readonly type: 'record';
    readonly name: string;
    readonly namespace?: string;
    readonly fields: readonly AvroField[];
}

export interface AvroEnumSchema {
    readonly type: 'enum';
    readonly name: string;
    readonly symbols: readonly string[];
}

export interface AvroArraySchema {
    readonly type: 'array';
    readonly items: AvroSchema;
}

export type AvroNonNullSchema =
    | 'string'
    | 'boolean'
    | 'double'
    | 'int'
    | AvroRecordSchema
    | AvroEnumSchema
    | AvroArraySchema;

export type AvroSchema = AvroNonNullSchema | readonly ['null', AvroNonNullSchema];

export class EventSchemaAvroRenderError extends Error {
    public constructor(
        public readonly eventName: string,
        public readonly payloadPath: string,
        reason: string,
    ) {
        super(`Cannot render Avro schema for event "${eventName}" at "${payloadPath}": ${reason}`);
        this.name = 'EventSchemaAvroRenderError';
    }
}

interface RenderContext {
    readonly eventName: string;
    readonly rootRecordName: string;
    readonly usedNamedTypes: Set<string>;
}

export function renderEventContractAvroSchema<
    const TName extends string,
    const TSchemaVersion extends number,
    TPayloadSchema extends z.ZodType,
>(
    contract: EventContract<TName, TSchemaVersion, TPayloadSchema>,
    options: AvroRenderOptions,
): AvroRecordSchema {
    assertRootName(options.recordName, contract.name);
    assertNamespace(options.namespace, contract.name);

    let normalizedSchema: unknown;

    try {
        normalizedSchema = z.toJSONSchema(contract.payload, {
            target: 'draft-2020-12',
            io: 'output',
            unrepresentable: 'throw',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new EventSchemaAvroRenderError(contract.name, 'payload', message);
    }

    const context: RenderContext = {
        eventName: contract.name,
        rootRecordName: options.recordName,
        usedNamedTypes: new Set<string>(),
    };

    return renderRecord(
        expectJsonObject(normalizedSchema, [], context),
        [],
        options.recordName,
        options.namespace,
        true,
        context,
    );
}

function renderNode(value: unknown, path: readonly string[], context: RenderContext): AvroSchema {
    const schema = expectJsonObject(value, path, context);
    const nullableSchema = extractNullableSchema(schema, path, context);

    if (nullableSchema !== undefined) {
        return ['null', renderNonNullNode(nullableSchema, path, context)];
    }

    return renderNonNullNode(schema, path, context);
}

function renderNonNullNode(
    value: unknown,
    path: readonly string[],
    context: RenderContext,
): AvroNonNullSchema {
    const schema = expectJsonObject(value, path, context);
    const type = schema.type;

    if (type === 'object') {
        return renderRecord(
            schema,
            path,
            generatedNamedTypeName('record', path, context),
            undefined,
            false,
            context,
        );
    }

    if (type === 'string' && schema.enum !== undefined) {
        return renderEnum(schema, path, context);
    }

    if (type === 'string') {
        assertOnlyKeys(schema, ['type'], path, context);
        return 'string';
    }

    if (type === 'boolean') {
        assertOnlyKeys(schema, ['type'], path, context);
        return 'boolean';
    }

    if (type === 'number') {
        assertOnlyKeys(schema, ['type'], path, context);
        return 'double';
    }

    if (type === 'integer') {
        return renderInt32(schema, path, context);
    }

    if (type === 'array') {
        assertOnlyKeys(schema, ['type', 'items'], path, context);
        if (schema.items === undefined) {
            fail(path, context, 'array items schema is missing');
        }

        return {
            type: 'array',
            items: renderNode(schema.items, path, context),
        };
    }

    fail(path, context, `unsupported normalized schema type ${describeValue(type)}`);
}

function renderRecord(
    schema: JsonObject,
    path: readonly string[],
    recordName: string,
    namespace: string | undefined,
    isRoot: boolean,
    context: RenderContext,
): AvroRecordSchema {
    assertOnlyKeys(
        schema,
        ['type', 'properties', 'required', 'additionalProperties'],
        path,
        context,
        isRoot,
    );

    if (schema.type !== 'object') {
        fail(path, context, 'the EventContract payload root must be an object');
    }

    if (schema.additionalProperties !== false) {
        fail(path, context, 'open/catch-all objects are unsupported in Avro v1');
    }

    const properties = expectJsonObject(schema.properties, path, context, 'object properties');
    const required = readStringArray(schema.required ?? [], path, context, 'required fields');
    const requiredSet = new Set(required);

    if (requiredSet.size !== required.length) {
        fail(path, context, 'normalized object contains duplicate required field names');
    }

    for (const requiredName of required) {
        if (!Object.prototype.hasOwnProperty.call(properties, requiredName)) {
            fail(path, context, `normalized object requires unknown field "${requiredName}"`);
        }
    }

    reserveNamedType(recordName, path, context);

    const fields: AvroField[] = [];

    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
        const fieldPath = [...path, fieldName];

        if (!isValidAvroName(fieldName)) {
            fail(fieldPath, context, `field name "${fieldName}" is not a valid Avro name`);
        }

        if (!requiredSet.has(fieldName)) {
            fail(fieldPath, context, 'optional fields are unsupported in Avro v1');
        }

        fields.push({
            name: fieldName,
            type: renderNode(fieldSchema, fieldPath, context),
        });
    }

    const record: AvroRecordSchema = {
        type: 'record',
        name: recordName,
        fields,
    };

    return namespace === undefined ? record : { ...record, namespace };
}

function renderEnum(
    schema: JsonObject,
    path: readonly string[],
    context: RenderContext,
): AvroEnumSchema {
    assertOnlyKeys(schema, ['type', 'enum'], path, context);

    const symbols = readStringArray(schema.enum, path, context, 'enum symbols');
    if (symbols.length === 0) {
        fail(path, context, 'empty enums are unsupported');
    }

    if (new Set(symbols).size !== symbols.length) {
        fail(path, context, 'enum symbols must be unique');
    }

    for (const symbol of symbols) {
        if (!isValidAvroName(symbol)) {
            fail(path, context, `enum symbol "${symbol}" is not a valid Avro symbol`);
        }
    }

    const name = generatedNamedTypeName('enum', path, context);
    reserveNamedType(name, path, context);

    return { type: 'enum', name, symbols };
}

function renderInt32(
    schema: JsonObject,
    path: readonly string[],
    context: RenderContext,
): 'int' {
    assertOnlyKeys(
        schema,
        ['type', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'format'],
        path,
        context,
    );

    if (schema.format !== undefined && schema.format !== 'int32') {
        fail(path, context, `unsupported integer format ${describeValue(schema.format)}`);
    }

    const inclusiveInt32 = schema.minimum === INT32_MIN && schema.maximum === INT32_MAX;
    const exclusiveInt32 =
        schema.exclusiveMinimum === INT32_MIN - 1 && schema.exclusiveMaximum === INT32_MAX + 1;
    const hasInclusiveOnly =
        inclusiveInt32 && schema.exclusiveMinimum === undefined && schema.exclusiveMaximum === undefined;
    const hasExclusiveOnly =
        exclusiveInt32 && schema.minimum === undefined && schema.maximum === undefined;

    if (!hasInclusiveOnly && !hasExclusiveOnly) {
        fail(
            path,
            context,
            'generic or additionally constrained integers are unsupported; use an unconstrained z.int32()',
        );
    }

    return 'int';
}

function extractNullableSchema(
    schema: JsonObject,
    path: readonly string[],
    context: RenderContext,
): unknown | undefined {
    if (schema.anyOf !== undefined) {
        assertOnlyKeys(schema, ['anyOf'], path, context);

        if (!Array.isArray(schema.anyOf) || schema.anyOf.length !== 2) {
            fail(path, context, 'arbitrary unions are unsupported; only nullable values are supported');
        }

        const [first, second] = schema.anyOf;
        const firstIsNull = isPlainNullSchema(first);
        const secondIsNull = isPlainNullSchema(second);

        if (firstIsNull === secondIsNull) {
            fail(path, context, 'arbitrary unions are unsupported; only nullable values are supported');
        }

        return firstIsNull ? second : first;
    }

    if (Array.isArray(schema.type)) {
        assertOnlyKeys(schema, ['type'], path, context);

        if (
            schema.type.length !== 2 ||
            !schema.type.every((entry): entry is string => typeof entry === 'string') ||
            !schema.type.includes('null')
        ) {
            fail(path, context, 'arbitrary type unions are unsupported; only nullable values are supported');
        }

        const nonNullType = schema.type.find((entry) => entry !== 'null');
        if (nonNullType === undefined) {
            fail(path, context, 'nullable schema is missing its non-null type');
        }

        return { type: nonNullType };
    }

    return undefined;
}

function generatedNamedTypeName(
    kind: 'record' | 'enum',
    path: readonly string[],
    context: RenderContext,
): string {
    if (path.length === 0) {
        fail(path, context, `cannot generate nested ${kind} name without a payload path`);
    }

    return `${context.rootRecordName}_${path.join('_')}_${kind}`;
}

function reserveNamedType(name: string, path: readonly string[], context: RenderContext): void {
    if (!isValidAvroName(name) || AVRO_PRIMITIVE_NAMES.has(name)) {
        fail(path, context, `generated Avro named type "${name}" is invalid`);
    }

    if (context.usedNamedTypes.has(name)) {
        fail(path, context, `generated Avro named type "${name}" collides with another payload type`);
    }

    context.usedNamedTypes.add(name);
}

function assertRootName(recordName: string, eventName: string): void {
    if (!isValidAvroName(recordName) || AVRO_PRIMITIVE_NAMES.has(recordName)) {
        throw new EventSchemaAvroRenderError(
            eventName,
            'payload',
            `root record name "${recordName}" is not a valid Avro named type`,
        );
    }
}

function assertNamespace(namespace: string | undefined, eventName: string): void {
    if (namespace === undefined || namespace === '' || namespace.split('.').every(isValidAvroName)) {
        return;
    }

    throw new EventSchemaAvroRenderError(
        eventName,
        'payload',
        `namespace "${namespace}" is not a valid Avro namespace`,
    );
}

function assertOnlyKeys(
    schema: JsonObject,
    allowedKeys: readonly string[],
    path: readonly string[],
    context: RenderContext,
    allowRootDialect = false,
): void {
    const allowed = new Set(allowedKeys);

    for (const key of Object.keys(schema)) {
        if (allowed.has(key) || (allowRootDialect && key === '$schema')) {
            continue;
        }
        fail(path, context, `unsupported normalized schema keyword "${key}"`);
    }
}

function expectJsonObject(
    value: unknown,
    path: readonly string[],
    context: RenderContext,
    label = 'schema',
): JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        fail(path, context, `${label} must be an object`);
    }

    return value as JsonObject;
}

function readStringArray(
    value: unknown,
    path: readonly string[],
    context: RenderContext,
    label: string,
): string[] {
    if (!Array.isArray(value) || !value.every((entry): entry is string => typeof entry === 'string')) {
        fail(path, context, `${label} must be a string array`);
    }

    return value;
}

function isPlainNullSchema(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length === 1 &&
        (value as JsonObject).type === 'null'
    );
}

function isValidAvroName(value: string): boolean {
    return AVRO_NAME_PATTERN.test(value);
}

function fail(path: readonly string[], context: RenderContext, reason: string): never {
    throw new EventSchemaAvroRenderError(context.eventName, formatPath(path), reason);
}

function formatPath(path: readonly string[]): string {
    return path.length === 0 ? 'payload' : `payload.${path.join('.')}`;
}

function describeValue(value: unknown): string {
    return JSON.stringify(value) ?? String(value);
}
