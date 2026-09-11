import type { EventContract } from '@event-driven-platform/event';
import { z } from 'zod';

import {
    assertAvroNamespace,
    assertAvroRootName,
    generatedAvroNamedTypeName,
    isValidAvroName,
    reserveAvroNamedType,
} from './avro-naming.js';
import type { AvroRenderOptions } from './avro-render-options.js';
import { failAvro, type AvroRenderContext } from './avro-render-context.js';
import type {
    AvroEnumSchema,
    AvroField,
    AvroNonNullSchema,
    AvroRecordSchema,
    AvroSchema,
} from './avro-schema.js';
import {
    assertOnlyJsonSchemaKeys,
    describeJsonSchemaValue,
    expectJsonObject,
    isPlainNullJsonSchema,
    readJsonSchemaStringArray,
    type JsonObject,
} from './avro-json-schema.js';
import { EventSchemaAvroRenderError } from './event-schema-avro-render-error.js';

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

export function renderEventContractAvroSchema<
    const TName extends string,
    const TSchemaVersion extends number,
    TPayloadSchema extends z.ZodType,
>(
    contract: EventContract<TName, TSchemaVersion, TPayloadSchema>,
    options: AvroRenderOptions,
): AvroRecordSchema {
    assertAvroRootName(options.recordName, contract.name);
    assertAvroNamespace(options.namespace, contract.name);

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

    const context: AvroRenderContext = {
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

function renderNode(value: unknown, path: readonly string[], context: AvroRenderContext): AvroSchema {
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
    context: AvroRenderContext,
): AvroNonNullSchema {
    const schema = expectJsonObject(value, path, context);
    const type = schema.type;

    if (type === 'object') {
        return renderRecord(
            schema,
            path,
            generatedAvroNamedTypeName('record', path, context),
            undefined,
            false,
            context,
        );
    }

    if (type === 'string' && schema.enum !== undefined) {
        return renderEnum(schema, path, context);
    }

    if (type === 'string') {
        assertOnlyJsonSchemaKeys(schema, ['type'], path, context);
        return 'string';
    }

    if (type === 'boolean') {
        assertOnlyJsonSchemaKeys(schema, ['type'], path, context);
        return 'boolean';
    }

    if (type === 'number') {
        assertOnlyJsonSchemaKeys(schema, ['type'], path, context);
        return 'double';
    }

    if (type === 'integer') {
        return renderInt32(schema, path, context);
    }

    if (type === 'array') {
        assertOnlyJsonSchemaKeys(schema, ['type', 'items'], path, context);
        if (schema.items === undefined) {
            failAvro(path, context, 'array items schema is missing');
        }

        return {
            type: 'array',
            items: renderNode(schema.items, path, context),
        };
    }

    failAvro(path, context, `unsupported normalized schema type ${describeJsonSchemaValue(type)}`);
}

function renderRecord(
    schema: JsonObject,
    path: readonly string[],
    recordName: string,
    namespace: string | undefined,
    isRoot: boolean,
    context: AvroRenderContext,
): AvroRecordSchema {
    assertOnlyJsonSchemaKeys(
        schema,
        ['type', 'properties', 'required', 'additionalProperties'],
        path,
        context,
        isRoot,
    );

    if (schema.type !== 'object') {
        failAvro(path, context, 'the EventContract payload root must be an object');
    }

    if (schema.additionalProperties !== false) {
        failAvro(path, context, 'open/catch-all objects are unsupported in Avro v1');
    }

    const properties = expectJsonObject(schema.properties, path, context, 'object properties');
    const required = readJsonSchemaStringArray(schema.required ?? [], path, context, 'required fields');
    const requiredSet = new Set(required);

    if (requiredSet.size !== required.length) {
        failAvro(path, context, 'normalized object contains duplicate required field names');
    }

    for (const requiredName of required) {
        if (!Object.prototype.hasOwnProperty.call(properties, requiredName)) {
            failAvro(path, context, `normalized object requires unknown field "${requiredName}"`);
        }
    }

    reserveAvroNamedType(recordName, path, context);

    const fields: AvroField[] = [];

    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
        const fieldPath = [...path, fieldName];

        if (!isValidAvroName(fieldName)) {
            failAvro(fieldPath, context, `field name "${fieldName}" is not a valid Avro name`);
        }

        if (!requiredSet.has(fieldName)) {
            failAvro(fieldPath, context, 'optional fields are unsupported in Avro v1');
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
    context: AvroRenderContext,
): AvroEnumSchema {
    assertOnlyJsonSchemaKeys(schema, ['type', 'enum'], path, context);

    const symbols = readJsonSchemaStringArray(schema.enum, path, context, 'enum symbols');
    if (symbols.length === 0) {
        failAvro(path, context, 'empty enums are unsupported');
    }

    if (new Set(symbols).size !== symbols.length) {
        failAvro(path, context, 'enum symbols must be unique');
    }

    for (const symbol of symbols) {
        if (!isValidAvroName(symbol)) {
            failAvro(path, context, `enum symbol "${symbol}" is not a valid Avro symbol`);
        }
    }

    const name = generatedAvroNamedTypeName('enum', path, context);
    reserveAvroNamedType(name, path, context);

    return { type: 'enum', name, symbols };
}

function renderInt32(
    schema: JsonObject,
    path: readonly string[],
    context: AvroRenderContext,
): 'int' {
    assertOnlyJsonSchemaKeys(
        schema,
        ['type', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'format'],
        path,
        context,
    );

    if (schema.format !== undefined && schema.format !== 'int32') {
        failAvro(path, context, `unsupported integer format ${describeJsonSchemaValue(schema.format)}`);
    }

    const inclusiveInt32 = schema.minimum === INT32_MIN && schema.maximum === INT32_MAX;
    const exclusiveInt32 =
        schema.exclusiveMinimum === INT32_MIN - 1 && schema.exclusiveMaximum === INT32_MAX + 1;
    const hasInclusiveOnly =
        inclusiveInt32 && schema.exclusiveMinimum === undefined && schema.exclusiveMaximum === undefined;
    const hasExclusiveOnly =
        exclusiveInt32 && schema.minimum === undefined && schema.maximum === undefined;

    if (!hasInclusiveOnly && !hasExclusiveOnly) {
        failAvro(
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
    context: AvroRenderContext,
): unknown | undefined {
    if (schema.anyOf !== undefined) {
        assertOnlyJsonSchemaKeys(schema, ['anyOf'], path, context);

        if (!Array.isArray(schema.anyOf) || schema.anyOf.length !== 2) {
            failAvro(path, context, 'arbitrary unions are unsupported; only nullable values are supported');
        }

        const [first, second] = schema.anyOf;
        const firstIsNull = isPlainNullJsonSchema(first);
        const secondIsNull = isPlainNullJsonSchema(second);

        if (firstIsNull === secondIsNull) {
            failAvro(path, context, 'arbitrary unions are unsupported; only nullable values are supported');
        }

        return firstIsNull ? second : first;
    }

    if (Array.isArray(schema.type)) {
        assertOnlyJsonSchemaKeys(schema, ['type'], path, context);

        if (
            schema.type.length !== 2 ||
            !schema.type.every((entry): entry is string => typeof entry === 'string') ||
            !schema.type.includes('null')
        ) {
            failAvro(path, context, 'arbitrary type unions are unsupported; only nullable values are supported');
        }

        const nonNullType = schema.type.find((entry) => entry !== 'null');
        if (nonNullType === undefined) {
            failAvro(path, context, 'nullable schema is missing its non-null type');
        }

        return { type: nonNullType };
    }

    return undefined;
}
