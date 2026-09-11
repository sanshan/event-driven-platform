import { EventSchemaProtobufRenderError } from './event-schema-protobuf-render-error.js';
import { failProtobuf, type ProtobufRenderContext } from './protobuf-render-context.js';

const PROTO_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertProtobufMessageName(name: string, eventName: string, label: string): void {
    if (!isValidProtoIdentifier(name)) {
        throw new EventSchemaProtobufRenderError(
            eventName,
            'payload',
            `${label} "${name}" is not a valid Protobuf identifier`,
        );
    }
}

export function assertProtobufPackageName(packageName: string | undefined, eventName: string): void {
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

export function assertProtobufFieldName(
    fieldName: string,
    path: readonly string[],
    context: ProtobufRenderContext,
): void {
    if (!isValidProtoIdentifier(fieldName)) {
        failProtobuf(path, context, `field name "${fieldName}" is not a valid Protobuf identifier`);
    }
}

export function assertProtobufJsonFieldNameUnique(
    fieldName: string,
    path: readonly string[],
    usedJsonNames: Map<string, string>,
    context: ProtobufRenderContext,
): void {
    const jsonName = toProtobufJsonName(fieldName);
    const existingField = usedJsonNames.get(jsonName);

    if (existingField !== undefined) {
        failProtobuf(
            path,
            context,
            `Protobuf JSON field name "${jsonName}" collides with field "${existingField}" in the same message`,
        );
    }

    usedJsonNames.set(jsonName, fieldName);
}

export function generatedProtobufMessageName(
    path: readonly string[],
    arrayItem: boolean,
    context: ProtobufRenderContext,
): string {
    if (path.length === 0) {
        failProtobuf(path, context, 'cannot generate nested message name without a payload path');
    }

    const suffix = arrayItem ? 'item_message' : 'message';
    return `${context.rootMessageName}_${path.join('_')}_${suffix}`;
}

export function reserveProtobufMessageName(
    name: string,
    path: readonly string[],
    context: ProtobufRenderContext,
): void {
    if (!isValidProtoIdentifier(name)) {
        failProtobuf(path, context, `generated Protobuf message name "${name}" is invalid`);
    }

    if (context.usedMessageNames.has(name)) {
        failProtobuf(path, context, `generated Protobuf message name "${name}" collides with another payload type`);
    }

    context.usedMessageNames.add(name);
}

function toProtobufJsonName(fieldName: string): string {
    let result = '';
    let uppercaseNext = false;

    for (const character of fieldName) {
        if (character === '_') {
            uppercaseNext = true;
            continue;
        }

        result += uppercaseNext ? character.toUpperCase() : character;
        uppercaseNext = false;
    }

    return result;
}

function isValidProtoIdentifier(value: string): boolean {
    return PROTO_IDENTIFIER_PATTERN.test(value);
}
