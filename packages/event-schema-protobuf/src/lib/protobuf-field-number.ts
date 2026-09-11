import { failProtobuf, type ProtobufRenderContext } from './protobuf-render-context.js';
import { describeJsonSchemaValue } from './protobuf-json-schema.js';

const PROTO_FIELD_NUMBER_MAX = 536870911;
const PROTO_RESERVED_FIELD_NUMBER_MIN = 19000;
const PROTO_RESERVED_FIELD_NUMBER_MAX = 19999;

export function requireProtobufFieldNumber(
    path: readonly string[],
    usedFieldNumbers: Map<number, string>,
    context: ProtobufRenderContext,
): number {
    const key = path.join('.');
    const number = context.fieldNumbers[key];

    if (number === undefined) {
        failProtobuf(path, context, `missing explicit Protobuf field number for "${key}"`);
    }

    if (!Number.isInteger(number) || number < 1 || number > PROTO_FIELD_NUMBER_MAX) {
        failProtobuf(
            path,
            context,
            `field number ${describeJsonSchemaValue(number)} must be an integer from 1 to ${PROTO_FIELD_NUMBER_MAX}`,
        );
    }

    if (number >= PROTO_RESERVED_FIELD_NUMBER_MIN && number <= PROTO_RESERVED_FIELD_NUMBER_MAX) {
        failProtobuf(path, context, `field number ${number} is in the Protocol Buffers reserved range 19000-19999`);
    }

    const existingField = usedFieldNumbers.get(number);
    if (existingField !== undefined) {
        failProtobuf(path, context, `field number ${number} duplicates field "${existingField}" in the same message`);
    }

    usedFieldNumbers.set(number, key);
    return number;
}
