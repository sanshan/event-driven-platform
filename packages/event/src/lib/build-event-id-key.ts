import type { EventIdDescriptor } from './event-id.js';

function encode(value: string): string {
    return encodeURIComponent(value);
}

export function buildEventIdKey(descriptor: EventIdDescriptor): string {
    return [
        `intentId=${encode(descriptor.intentId)}`,
        `eventIndex=${descriptor.eventIndex}`,
        `eventName=${encode(descriptor.eventName)}`,
        `schemaVersion=${descriptor.schemaVersion}`,
    ].join('&');
}
