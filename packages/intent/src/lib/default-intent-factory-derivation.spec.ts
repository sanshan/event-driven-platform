import { describe, expect, expectTypeOf, it } from 'vitest';

import { DefaultIntentFactory } from './default-intent-factory.js';
import type { Intent, IntentDerivationRequest } from './intent.js';

const parentA = {
    id: '11111111-1111-5111-8111-111111111111',
};

const parentB = {
    id: '22222222-2222-5222-8222-222222222222',
};

function derive(overrides: Partial<IntentDerivationRequest> = {}): Intent {
    const factory = new DefaultIntentFactory();

    return factory.derive({
        parent: parentA,
        slot: 'reserve-funds',
        ...overrides,
    });
}

describe('DefaultIntentFactory causal derivation', () => {
    it('derives a deterministic 1:1 child from parent and semantic slot', () => {
        const first = derive();
        const second = derive();

        expect(first).toEqual(second);
        expect(first.key).toBe(
            '@derived:v1:parentIntentId=11111111-1111-5111-8111-111111111111:slot=reserve-funds',
        );
        expect(first.parent).toEqual(parentA);
        expect(first.derivation).toEqual({
            slot: 'reserve-funds',
        });
        expectTypeOf(first).toEqualTypeOf<Intent>();

        if (first.parent === undefined || first.derivation === undefined) {
            throw new Error('Derived Intent must expose parent and derivation metadata.');
        }

        expect(Object.isFrozen(first)).toBe(true);
        expect(Object.isFrozen(first.parent)).toBe(true);
        expect(Object.isFrozen(first.derivation)).toBe(true);
    });

    it('accepts a full Intent as the parent reference', () => {
        const factory = new DefaultIntentFactory();
        const parentIntent: Intent = {
            id: parentA.id,
            key: 'wallet:create:v1:tenantType=merchant&tenantId=merchant-1:userId=user-1',
        };

        const child = factory.derive({
            parent: parentIntent,
            slot: 'reserve-funds',
        });

        expect(child.parent).toEqual(parentA);
    });

    it('derives deterministic 1:N children from stable discriminators', () => {
        const first = derive({ discriminator: 'invoice-1' });
        const replay = derive({ discriminator: 'invoice-1' });
        const second = derive({ discriminator: 'invoice-2' });

        expect(first).toEqual(replay);
        expect(first.id).not.toBe(second.id);
        expect(first.derivation).toEqual({
            slot: 'reserve-funds',
            discriminator: 'invoice-1',
        });
    });

    it('keeps 1:N identities stable when logical children are reordered', () => {
        const factory = new DefaultIntentFactory();
        const initialOrder = ['invoice-1', 'invoice-2', 'invoice-3'];
        const replayOrder = ['invoice-3', 'invoice-1', 'invoice-2'];

        const initial = new Map(
            initialOrder.map((discriminator) => [
                discriminator,
                factory.derive({
                    parent: parentA,
                    slot: 'reserve-funds',
                    discriminator,
                }).id,
            ]),
        );

        const replay = new Map(
            replayOrder.map((discriminator) => [
                discriminator,
                factory.derive({
                    parent: parentA,
                    slot: 'reserve-funds',
                    discriminator,
                }).id,
            ]),
        );

        expect(replay).toEqual(initial);
    });

    it('changes child identity when the parent changes', () => {
        const first = derive({ parent: parentA });
        const second = derive({ parent: parentB });

        expect(first.id).not.toBe(second.id);
        expect(second.parent).toEqual(parentB);
    });

    it('changes child identity when the semantic slot changes', () => {
        const first = derive({ slot: 'reserve-funds' });
        const second = derive({ slot: 'capture-funds' });

        expect(first.id).not.toBe(second.id);
    });

    it('keeps the same logical child identity when replay-time Operation snapshot changes', () => {
        const factory = new DefaultIntentFactory();
        const firstOperationSnapshot = {
            amount: 100,
            operationType: 'ReserveFunds',
        };
        const replayOperationSnapshot = {
            amount: 200,
            operationType: 'CaptureFunds',
        };

        const first = factory.derive({
            parent: parentA,
            slot: 'apply-payment-effect',
        });
        const replay = factory.derive({
            parent: parentA,
            slot: 'apply-payment-effect',
        });

        expect(firstOperationSnapshot).not.toEqual(replayOperationSnapshot);
        expect(first).toEqual(replay);
    });

    it('supports Event-driven derivation from producing Intent id, reaction slot, and event id', () => {
        const factory = new DefaultIntentFactory();

        const firstDelivery = factory.derive({
            parent: {
                id: 'producing-operation-intent-id',
            },
            slot: 'start-order-fulfillment',
            discriminator: 'event-1',
        });
        const redelivery = factory.derive({
            parent: {
                id: 'producing-operation-intent-id',
            },
            slot: 'start-order-fulfillment',
            discriminator: 'event-1',
        });
        const differentEvent = factory.derive({
            parent: {
                id: 'producing-operation-intent-id',
            },
            slot: 'start-order-fulfillment',
            discriminator: 'event-2',
        });
        const differentReaction = factory.derive({
            parent: {
                id: 'producing-operation-intent-id',
            },
            slot: 'notify-customer',
            discriminator: 'event-1',
        });

        expect(redelivery).toEqual(firstDelivery);
        expect(differentEvent.id).not.toBe(firstDelivery.id);
        expect(differentReaction.id).not.toBe(firstDelivery.id);
        expect(firstDelivery.parent).toEqual({
            id: 'producing-operation-intent-id',
        });
        expect(firstDelivery.derivation).toEqual({
            slot: 'start-order-fulfillment',
            discriminator: 'event-1',
        });
    });

    it('keeps CorrelationId outside derived Intent identity', () => {
        const factory = new DefaultIntentFactory();
        const firstContext = {
            correlationId: 'correlation-1',
            parentIntentId: 'producing-operation-intent-id',
            eventId: 'event-1',
        };
        const secondContext = {
            ...firstContext,
            correlationId: 'correlation-2',
        };

        const first = factory.derive({
            parent: { id: firstContext.parentIntentId },
            slot: 'start-order-fulfillment',
            discriminator: firstContext.eventId,
        });
        const second = factory.derive({
            parent: { id: secondContext.parentIntentId },
            slot: 'start-order-fulfillment',
            discriminator: secondContext.eventId,
        });

        expect(firstContext.correlationId).not.toBe(secondContext.correlationId);
        expect(first).toEqual(second);
    });

    it('rejects invalid derivation inputs through existing validation style', () => {
        const factory = new DefaultIntentFactory();

        expect(() =>
            factory.derive({
                parent: { id: '' },
                slot: 'reserve-funds',
            }),
        ).toThrow();
        expect(() =>
            factory.derive({
                parent: parentA,
                slot: 'Reserve Funds',
            }),
        ).toThrow();
        expect(() =>
            factory.derive({
                parent: parentA,
                slot: 'reserve-funds',
                discriminator: ' ',
            }),
        ).toThrow();
    });
});
