import type { EventContract } from '@event-driven-platform/event';
import { z } from 'zod';

const PROTO_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PROTO_FIELD_NUMBER_MAX = 536870911;
const PROTO_RESERVED_FIELD_NUMBER_MIN = 19000;
const PROTO_RESERVED_FIELD_NUMBER_MAX = 19999;
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
const PROTO_KEYWORDS = new Set([
    'syntax',
    'package',
    'import',
    'option',
    'message',
    'enum',
    'service',
    'rpc',
    'returns',
    'repeated',
    'optional',
    'required',
    'reserved',
    'extensions',
    'to',
    'max',
    'oneof',
    'map',
    'group',
    'public',
    'weak',
    'true',
    'false',
    'double',
    'float',
    'int32',
    'int64',
    'uint32',
    'uint64',
    'sint32',
    'sint64',
    'fixed32',
    'fixed64',
    'sfixed32',
    'sfixed64',
    'bool',
    'string',
    'bytes',
]);

type JsonObject = Record<string, unknown>;

type ProtobufScalarType = 'string' | 'bool' | 'double' | 'int32';

type ProtobufFieldType = ProtobufScalarType | string;

export interface ProtobufRenderOptions {
    readonly messageName: string;
    readonly package?: string;
    readonly fieldNumbers: Readonly<Record<string, number>>;
}

export class EventSchemaProtobufRenderError extends Error {
    public constructor(
        public readonly eventName: string,
        public readonly payloadPath: string,
        reason: string,
    ) {
        super(`Cannot render Protobuf schema for event "${eventName}" at "${payloadPath}": ${reason}`);
        this.name = 'EventSchemaProtobufRenderError';
    }
}

interface RenderContext {
    readonly eventName: string;
    readonly rootMessageName: string;
    readonly fieldNumbers: Readonly<Record<string, number>>;
    readonly usedMessageNames: Set<string>;
    readonly nestedMessages: string[];
}

interface RenderedField {
    readonly number: number;
    readonly source: string;
}

interface RenderedType {
    readonly type: ProtobufFieldType;
    readonly repeated: boolean;
}

export function renderEventContractProtobufSchema<
    const TName extends string,
    const TSchemaVersion extends number,
    TPayloadSchema extends z.ZodType,
>(
    contract: EventContract<TName, TSchemaVersion, TPayloadSchema>,
    options: ProtobufRenderOptions,
): string {
    assertMessageName(options.messageName, contract.name, 'root message name');
    assertPackageName(options.package, contract.name);

    let normalizedSchema: unknown;

    try {
        normalizedSchema = z.toJSONSchema(contract.payload, {
            target: 'draft-2020-12',
            io: 'output',
            unrepresentable: 'throw',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new EventSchemaProtobufRenderError(contract.name, 'payload', message);
    }

    const context: RenderContext = {
        eventName: contract.name,
        rootMessageName: options.messageName,
        fieldNumbers: options.fieldNumbers,
        usedMessageNames: new Set([options.messageName]),
        nestedMessages: [],
    };

    const rootMessage = renderMessage(
        expectJsonObject(normalizedSchema, [], context),
        [],
        options.messageName,
        true,
        context,
    );

    const sections = ['syntax = "proto3";'];

    if (options.package !== undefined) {
        sections.push(`package ${options.package};`);
    }

    sections.push(rootMessage, ...context.nestedMessages);

    return `${sections.join('\n\n')}\n`;
}

function renderMessage(
    schema: JsonObject,
    path: readonly string[],
    messageName: string,
    isRoot: boolean,
    context: RenderContext,
): string {
    assertOnlyKeys(
        schema,
        ['type', 'properties', 'required', 'additionalProperties'],
        path,
        context,
        isRoot,
    );

    if (schema.type !== 'object') {
        fail(path, context, isRoot ? 'the EventContract payload root must be an object' : 'expected an object');
    }

    if (schema.additionalProperties !== false) {
        fail(path, context, 'open/catch-all objects are unsupported in Protobuf v1');
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

    const usedFieldNumbers = new Map<number, string>();
    const fields: RenderedField[] = [];

    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
        const fieldPath = [...path, fieldName];
        assertFieldName(fieldName, fieldPath, context);

        const fieldNumber = requireFieldNumber(fieldPath, usedFieldNumbers, context);
        const optional = !requiredSet.has(fieldName);
        const renderedType = renderFieldType(fieldSchema, fieldPath, optional, context);
        const label = renderedType.repeated ? 'repeated ' : optional ? 'optional ' : '';

        fields.push({
            number: fieldNumber,
            source: `  ${label}${renderedType.type} ${fieldName} = ${fieldNumber};`,
        });
    }

    fields.sort((left, right) => left.number - right.number);

    return [`message ${messageName} {`, ...fields.map((field) => field.source), '}'].join('\n');
}

function renderFieldType(
    value: unknown,
    path: readonly string[],
    optional: boolean,
    context: RenderContext,
): RenderedType {
    const schema = expectJsonObject(value, path, context);

    if (isNullableSchema(schema)) {
        fail(path, context, 'nullable values are unsupported in Protobuf v1');
    }

    if (schema.type === 'array') {
        if (optional) {
            fail(path, context, 'optional arrays are unsupported because Protobuf repeated fields do not preserve presence');
        }

        assertOnlyKeys(schema, ['type', 'items'], path, context);
        if (schema.items === undefined) {
            fail(path, context, 'array items schema is missing');
        }

        const itemSchema = expectJsonObject(schema.items, path, context, 'array items schema');
        if (isNullableSchema(itemSchema)) {
            fail(path, context, 'nullable array items are unsupported in Protobuf v1');
        }
        if (itemSchema.type === 'array') {
            fail(path, context, 'nested arrays are unsupported in Protobuf v1');
        }

        const itemType = renderNonRepeatedType(itemSchema, path, true, context);
        return { type: itemType, repeated: true };
    }

    return { type: renderNonRepeatedType(schema, path, false, context), repeated: false };
}

function renderNonRepeatedType(
    schema: JsonObject,
    path: readonly string[],
    arrayItem: boolean,
    context: RenderContext,
): ProtobufFieldType {
    if (schema.type === 'object') {
        const messageName = generatedMessageName(path, arrayItem, context);
        reserveMessageName(messageName, path, context);
        const nestedMessage = renderMessage(schema, path, messageName, false, context);
        context.nestedMessages.push(nestedMessage);
        return messageName;
    }

    if (schema.type === 'string' && schema.enum !== undefined) {
        fail(path, context, 'finite business string enums are unsupported in Protobuf v1');
    }

    if (schema.type === 'string') {
        assertOnlyKeys(schema, ['type'], path, context);
        return 'string';
    }

    if (schema.type === 'boolean') {
        assertOnlyKeys(schema, ['type'], path, context);
        return 'bool';
    }

    if (schema.type === 'number') {
        assertOnlyKeys(schema, ['type'], path, context);
        return 'double';
    }

    if (schema.type === 'integer') {
        return renderInt32(schema, path, context);
    }

    fail(path, context, `unsupported normalized schema type ${describeValue(schema.type)}`);
}

function renderInt32(
    schema: JsonObject,
    path: readonly string[],
    context: RenderContext,
): 'int32' {
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

    return 'int32';
}

function requireFieldNumber(
    path: readonly string[],
    usedFieldNumbers: Map<number, string>,
    context: RenderContext,
): number {
    const key = path.join('.');
    const number = context.fieldNumbers[key];

    if (number === undefined) {
        fail(path, context, `missing explicit Protobuf field number for "${key}"`);
    }

    if (!Number.isInteger(number) || number < 1 || number > PROTO_FIELD_NUMBER_MAX) {
        fail(
            path,
            context,
            `field number ${describeValue(number)} must be an integer from 1 to ${PROTO_FIELD_NUMBER_MAX}`,
        );
    }

    if (number >= PROTO_RESERVED_FIELD_NUMBER_MIN && number <= PROTO_RESERVED_FIELD_NUMBER_MAX) {
        fail(path, context, `field number ${number} is in the Protocol Buffers reserved range 19000-19999`);
    }

    const existingField = usedFieldNumbers.get(number);
    if (existingField !== undefined) {
        fail(path, context, `field number ${number} duplicates field "${existingField}" in the same message`);
    }

    usedFieldNumbers.set(number, key);
    return number;
}

function isNullableSchema(schema: JsonObject): boolean {
    if (schema.anyOf !== undefined) {
        if (!Array.isArray(schema.anyOf)) {
            return true;
        }
        return schema.anyOf.some(isPlainNullSchema);
    }

    return Array.isArray(schema.type) && schema.type.includes('null');
}

function generatedMessageName(
    path: readonly string[],
    arrayItem: boolean,
    context: RenderContext,
): string {
    if (path.length === 0) {
        fail(path, context, 'cannot generate nested message name without a payload path');
    }

    const suffix = arrayItem ? 'item_message' : 'message';
    return `${context.rootMessageName}_${path.join('_')}_${suffix}`;
}

function reserveMessageName(name: string, path: readonly string[], context: RenderContext): void {
    if (!isValidProtoIdentifier(name)) {
        fail(path, context, `generated Protobuf message name "${name}" is invalid`);
    }

    if (context.usedMessageNames.has(name)) {
        fail(path, context, `generated Protobuf message name "${name}" collides with another payload type`);
    }

    context.usedMessageNames.add(name);
}

function assertMessageName(name: string, eventName: string, label: string): void {
    if (!isValidProtoIdentifier(name)) {
        throw new EventSchemaProtobufRenderError(
            eventName,
            'payload',
            `${label} "${name}" is not a valid Protobuf identifier`,
        );
    }
}

function assertPackageName(packageName: string | undefined, eventName: string): void {
    if (packageName === undefined) {
        return;
    }

    if (packageName.length === 0 || !packageName.split('.').every(isValidProtoIdentifier)) {
        throw new EventSchemaProtobufRenderError(
            eventName,
            'payload',
            `package "${packageName}" is not a valid Protobuf package name`,
        );
    }
}

function assertFieldName(fieldName: string, path: readonly string[], context: RenderContext): void {
    if (!isValidProtoIdentifier(fieldName)) {
        fail(path, context, `field name "${fieldName}" is not a valid Protobuf identifier`);
    }
}

function isValidProtoIdentifier(value: string): boolean {
    return PROTO_IDENTIFIER_PATTERN.test(value) && !PROTO_KEYWORDS.has(value);
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

function fail(path: readonly string[], context: RenderContext, reason: string): never {
    throw new EventSchemaProtobufRenderError(context.eventName, formatPath(path), reason);
}

function formatPath(path: readonly string[]): string {
    return path.length === 0 ? 'payload' : `payload.${path.join('.')}`;
}

function describeValue(value: unknown): string {
    return JSON.stringify(value) ?? String(value);
}
