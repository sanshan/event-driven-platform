import { EventSchemaAvroRenderError } from './event-schema-avro-render-error.js';
import { failAvro, type AvroRenderContext } from './avro-render-context.js';

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

export function assertAvroRootName(recordName: string, eventName: string): void {
    if (!isValidAvroNamedTypeName(recordName)) {
        throw new EventSchemaAvroRenderError(
            eventName,
            'payload',
            `root record name "${recordName}" is not a valid Avro named type`,
        );
    }
}

export function assertAvroNamespace(namespace: string | undefined, eventName: string): void {
    if (namespace === undefined || namespace === '' || namespace.split('.').every(isValidAvroName)) {
        return;
    }

    throw new EventSchemaAvroRenderError(
        eventName,
        'payload',
        `namespace "${namespace}" is not a valid Avro namespace`,
    );
}

export function generatedAvroNamedTypeName(
    kind: 'record' | 'enum',
    path: readonly string[],
    context: AvroRenderContext,
): string {
    if (path.length === 0) {
        failAvro(path, context, `cannot generate nested ${kind} name without a payload path`);
    }

    return `${context.rootRecordName}_${path.join('_')}_${kind}`;
}

export function reserveAvroNamedType(
    name: string,
    path: readonly string[],
    context: AvroRenderContext,
): void {
    if (!isValidAvroNamedTypeName(name)) {
        failAvro(path, context, `generated Avro named type "${name}" is invalid`);
    }

    if (context.usedNamedTypes.has(name)) {
        failAvro(path, context, `generated Avro named type "${name}" collides with another payload type`);
    }

    context.usedNamedTypes.add(name);
}

export function isValidAvroName(value: string): boolean {
    return AVRO_NAME_PATTERN.test(value);
}

function isValidAvroNamedTypeName(value: string): boolean {
    return isValidAvroName(value) && !AVRO_PRIMITIVE_NAMES.has(value);
}
