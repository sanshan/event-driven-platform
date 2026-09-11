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
