import { EventSchemaProtobufRenderError } from './event-schema-protobuf-render-error.js';

export interface ProtobufRenderContext {
    readonly eventName: string;
    readonly rootMessageName: string;
    readonly fieldNumbers: Readonly<Record<string, number>>;
    readonly usedMessageNames: Set<string>;
    readonly nestedMessages: string[];
}

export function failProtobuf(
    path: readonly string[],
    context: ProtobufRenderContext,
    reason: string,
): never {
    throw new EventSchemaProtobufRenderError(context.eventName, formatPayloadPath(path), reason);
}

function formatPayloadPath(path: readonly string[]): string {
    return path.length === 0 ? 'payload' : `payload.${path.join('.')}`;
}
