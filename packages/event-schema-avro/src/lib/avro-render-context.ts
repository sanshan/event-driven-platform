import { EventSchemaAvroRenderError } from './event-schema-avro-render-error.js';

export interface AvroRenderContext {
    readonly eventName: string;
    readonly rootRecordName: string;
    readonly usedNamedTypes: Set<string>;
}

export function failAvro(
    path: readonly string[],
    context: AvroRenderContext,
    reason: string,
): never {
    throw new EventSchemaAvroRenderError(context.eventName, formatPayloadPath(path), reason);
}

function formatPayloadPath(path: readonly string[]): string {
    return path.length === 0 ? 'payload' : `payload.${path.join('.')}`;
}
