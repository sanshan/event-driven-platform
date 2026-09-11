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
