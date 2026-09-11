import type { EventContract } from '@event-driven-platform/event';
import { z } from 'zod';

import { EventSchemaProtobufRenderError } from './event-schema-protobuf-render-error.js';
import { requireProtobufFieldNumber } from './protobuf-field-number.js';
import {
    assertProtobufFieldName,
    assertProtobufJsonFieldNameUnique,
    assertProtobufMessageName,
    assertProtobufPackageName,
    generatedProtobufMessageName,
    reserveProtobufMessageName,
} from './protobuf-naming.js';
import type { ProtobufRenderOptions } from './protobuf-render-options.js';
import { failProtobuf, type ProtobufRenderContext } from './protobuf-render-context.js';
import {
    assertOnlyJsonSchemaKeys,
    describeJsonSchemaValue,
    expectJsonObject,
    isPlainNullJsonSchema,
    readJsonSchemaStringArray,
    type JsonObject,
} from './protobuf-json-schema.js';

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

type ProtobufScalarType = 'string' | 'bool' | 'double' | 'int32';
type ProtobufFieldType = ProtobufScalarType | string;

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
    assertProtobufMessageName(options.messageName, contract.name, 'root message name');
    assertProtobufPackageName(options.package, contract.name);

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

    const context: ProtobufRenderContext = {
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

    sections.push(rootMessage, ...context.nestedMessages.sort());

    return `${sections.join('\n\n')}\n`;
}

function renderMessage(
    schema: JsonObject,
    path: readonly string[],
    messageName: string,
    isRoot: boolean,
    context: ProtobufRenderContext,
): string {
    assertOnlyJsonSchemaKeys(
        schema,
        ['type', 'properties', 'required', 'additionalProperties'],
        path,
        context,
        isRoot,
    );

    if (schema.type !== 'object') {
        failProtobuf(path, context, isRoot ? 'the EventContract payload root must be an object' : 'expected an object');
    }

    if (schema.additionalProperties !== false) {
        failProtobuf(path, context, 'open/catch-all objects are unsupported in Protobuf v1');
    }

    const properties = expectJsonObject(schema.properties, path, context, 'object properties');
    const required = readJsonSchemaStringArray(schema.required ?? [], path, context, 'required fields');
    const requiredSet = new Set(required);

    if (requiredSet.size !== required.length) {
        failProtobuf(path, context, 'normalized object contains duplicate required field names');
    }

    for (const requiredName of required) {
        if (!Object.prototype.hasOwnProperty.call(properties, requiredName)) {
            failProtobuf(path, context, `normalized object requires unknown field "${requiredName}"`);
        }
    }

    const usedFieldNumbers = new Map<number, string>();
    const usedJsonNames = new Map<string, string>();
    const fields: RenderedField[] = [];

    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
        const fieldPath = [...path, fieldName];
        assertProtobufFieldName(fieldName, fieldPath, context);
        assertProtobufJsonFieldNameUnique(fieldName, fieldPath, usedJsonNames, context);

        const fieldNumber = requireProtobufFieldNumber(fieldPath, usedFieldNumbers, context);
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
    context: ProtobufRenderContext,
): RenderedType {
    const schema = expectJsonObject(value, path, context);

    if (isNullableSchema(schema)) {
        failProtobuf(path, context, 'nullable values are unsupported in Protobuf v1');
    }

    if (schema.type === 'array') {
        if (optional) {
            failProtobuf(path, context, 'optional arrays are unsupported because Protobuf repeated fields do not preserve presence');
        }

        assertOnlyJsonSchemaKeys(schema, ['type', 'items'], path, context);
        if (schema.items === undefined) {
            failProtobuf(path, context, 'array items schema is missing');
        }

        const itemSchema = expectJsonObject(schema.items, path, context, 'array items schema');
        if (isNullableSchema(itemSchema)) {
            failProtobuf(path, context, 'nullable array items are unsupported in Protobuf v1');
        }
        if (itemSchema.type === 'array') {
            failProtobuf(path, context, 'nested arrays are unsupported in Protobuf v1');
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
    context: ProtobufRenderContext,
): ProtobufFieldType {
    if (schema.type === 'object') {
        const messageName = generatedProtobufMessageName(path, arrayItem, context);
        reserveProtobufMessageName(messageName, path, context);
        const nestedMessage = renderMessage(schema, path, messageName, false, context);
        context.nestedMessages.push(nestedMessage);
        return messageName;
    }

    if (schema.type === 'string' && schema.enum !== undefined) {
        failProtobuf(path, context, 'finite business string enums are unsupported in Protobuf v1');
    }

    if (schema.type === 'string') {
        assertOnlyJsonSchemaKeys(schema, ['type'], path, context);
        return 'string';
    }

    if (schema.type === 'boolean') {
        assertOnlyJsonSchemaKeys(schema, ['type'], path, context);
        return 'bool';
    }

    if (schema.type === 'number') {
        assertOnlyJsonSchemaKeys(schema, ['type'], path, context);
        return 'double';
    }

    if (schema.type === 'integer') {
        return renderInt32(schema, path, context);
    }

    failProtobuf(path, context, `unsupported normalized schema type ${describeJsonSchemaValue(schema.type)}`);
}

function renderInt32(
    schema: JsonObject,
    path: readonly string[],
    context: ProtobufRenderContext,
): 'int32' {
    assertOnlyJsonSchemaKeys(
        schema,
        ['type', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'format'],
        path,
        context,
    );

    if (schema.format !== undefined && schema.format !== 'int32') {
        failProtobuf(path, context, `unsupported integer format ${describeJsonSchemaValue(schema.format)}`);
    }

    const inclusiveInt32 = schema.minimum === INT32_MIN && schema.maximum === INT32_MAX;
    const exclusiveInt32 =
        schema.exclusiveMinimum === INT32_MIN - 1 && schema.exclusiveMaximum === INT32_MAX + 1;
    const hasInclusiveOnly =
        inclusiveInt32 && schema.exclusiveMinimum === undefined && schema.exclusiveMaximum === undefined;
    const hasExclusiveOnly =
        exclusiveInt32 && schema.minimum === undefined && schema.maximum === undefined;

    if (!hasInclusiveOnly && !hasExclusiveOnly) {
        failProtobuf(
            path,
            context,
            'generic or additionally constrained integers are unsupported; use an unconstrained z.int32()',
        );
    }

    return 'int32';
}

function isNullableSchema(schema: JsonObject): boolean {
    if (schema.anyOf !== undefined) {
        if (!Array.isArray(schema.anyOf)) {
            return true;
        }

        return schema.anyOf.some(isPlainNullJsonSchema);
    }

    return Array.isArray(schema.type) && schema.type.includes('null');
}
