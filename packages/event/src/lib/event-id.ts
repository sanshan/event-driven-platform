import type { Brand } from '@event-driven-platform/types';

export type EventId = Brand<string, 'EventId'>;

export interface EventIdDescriptor {
    readonly intentId: string;

    readonly eventIndex: number;

    readonly eventName: string;

    readonly schemaVersion: number;
}

export interface EventIdFactory {
    create(descriptor: EventIdDescriptor): EventId;
}
