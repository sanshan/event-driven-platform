import { describe, expect, expectTypeOf, it } from 'vitest';

import { DefaultEventIdFactory, type EventId } from '../index.js';

describe('DefaultEventIdFactory', () => {
    it('creates a deterministic EventId', () => {
        const factory = new DefaultEventIdFactory();

        const first = factory.create({
            intentId: 'intent-1',
            eventIndex: 0,
            eventName: 'wallet.created',
            schemaVersion: 1,
        });

        const second = factory.create({
            intentId: 'intent-1',
            eventIndex: 0,
            eventName: 'wallet.created',
            schemaVersion: 1,
        });

        expect(first).toBe(second);

        expectTypeOf(first).toEqualTypeOf<EventId>();
    });

    it('creates different identifiers for different event indexes', () => {
        const factory = new DefaultEventIdFactory();

        const first = factory.create({
            intentId: 'intent-1',
            eventIndex: 0,
            eventName: 'wallet.created',
            schemaVersion: 1,
        });

        const second = factory.create({
            intentId: 'intent-1',
            eventIndex: 1,
            eventName: 'wallet.created',
            schemaVersion: 1,
        });

        expect(first).not.toBe(second);
    });

    it('creates different identifiers for different Intents', () => {
        const factory = new DefaultEventIdFactory();

        const first = factory.create({
            intentId: 'intent-1',
            eventIndex: 0,
            eventName: 'wallet.created',
            schemaVersion: 1,
        });

        const second = factory.create({
            intentId: 'intent-2',
            eventIndex: 0,
            eventName: 'wallet.created',
            schemaVersion: 1,
        });

        expect(first).not.toBe(second);
    });

    it('creates different identifiers for different Event names', () => {
        const factory = new DefaultEventIdFactory();

        const first = factory.create({
            intentId: 'intent-1',
            eventIndex: 0,
            eventName: 'wallet.created',
            schemaVersion: 1,
        });

        const second = factory.create({
            intentId: 'intent-1',
            eventIndex: 0,
            eventName: 'balance.initialized',
            schemaVersion: 1,
        });

        expect(first).not.toBe(second);
    });

    it('creates different identifiers for different schema versions', () => {
        const factory = new DefaultEventIdFactory();

        const first = factory.create({
            intentId: 'intent-1',
            eventIndex: 0,
            eventName: 'wallet.created',
            schemaVersion: 1,
        });

        const second = factory.create({
            intentId: 'intent-1',
            eventIndex: 0,
            eventName: 'wallet.created',
            schemaVersion: 2,
        });

        expect(first).not.toBe(second);
    });

    it('rejects an empty Intent identifier', () => {
        const factory = new DefaultEventIdFactory();

        expect(() =>
            factory.create({
                intentId: '',
                eventIndex: 0,
                eventName: 'wallet.created',
                schemaVersion: 1,
            }),
        ).toThrow();
    });

    it('rejects a negative event index', () => {
        const factory = new DefaultEventIdFactory();

        expect(() =>
            factory.create({
                intentId: 'intent-1',
                eventIndex: -1,
                eventName: 'wallet.created',
                schemaVersion: 1,
            }),
        ).toThrow();
    });

    it('rejects a non-integer event index', () => {
        const factory = new DefaultEventIdFactory();

        expect(() =>
            factory.create({
                intentId: 'intent-1',
                eventIndex: 0.5,
                eventName: 'wallet.created',
                schemaVersion: 1,
            }),
        ).toThrow();
    });

    it('rejects an empty Event name', () => {
        const factory = new DefaultEventIdFactory();

        expect(() =>
            factory.create({
                intentId: 'intent-1',
                eventIndex: 0,
                eventName: '',
                schemaVersion: 1,
            }),
        ).toThrow();
    });

    it('rejects a non-positive schema version', () => {
        const factory = new DefaultEventIdFactory();

        expect(() =>
            factory.create({
                intentId: 'intent-1',
                eventIndex: 0,
                eventName: 'wallet.created',
                schemaVersion: 0,
            }),
        ).toThrow();
    });
});
