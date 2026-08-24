import { describe, expect, expectTypeOf, it } from 'vitest';

import { IntentFactory } from './intent-factory.js';
import type { Intent, IntentDerivationRequest } from './intent.js';

const parentA = {
    id: '11111111-1111-5111-8111-111111111111',
};

const parentB = {
    id: '22222222-2222-5222-8222-222222222222',
};

function derive(overrides: Partial<IntentDerivationRequest> = {}): Intent {
    return IntentFactory.derive({
        parent: parentA,
        slot: 'reserve-funds',
        ...overrides,
    });
}

describe('IntentFactory causal derivation', () => {
    it('derives the same deterministic 1:1 child as the previous canonical contract', () => {
        const first = derive();
        const replay = derive();

        expect(replay).toEqual(first);
        expect(first.key).toBe(
            '@derived:v1:parentIntentId=11111111-1111-5111-8111-111111111111:slot=reserve-funds',
        );
        expect(first.parent).toEqual(parentA);
        expect(first.derivation).toEqual({ slot: 'reserve-funds' });
        expectTypeOf(first).toEqualTypeOf<Intent>();

        if (first.parent === undefined || first.derivation === undefined) {
            throw new Error('Derived Intent must expose parent and derivation metadata.');
        }

        expect(Object.isFrozen(first)).toBe(true);
        expect(Object.isFrozen(first.parent)).toBe(true);
        expect(Object.isFrozen(first.derivation)).toBe(true);
    });

    it('accepts a full Intent as the parent reference while storing only parent identity', () => {
        const parentIntent: Intent = {
            id: parentA.id,
            key: 'wallet:create:v1:tenantType=merchant&tenantId=merchant-1:userId=user-1',
        };

        const child = IntentFactory.derive({
            parent: parentIntent,
            slot: 'reserve-funds',
        });

        expect(child.parent).toEqual(parentA);
    });

    it('derives deterministic 1:N children and remains stable when they are reordered', () => {
        const initialOrder = ['invoice-1', 'invoice-2', 'invoice-3'];
        const replayOrder = ['invoice-3', 'invoice-1', 'invoice-2'];

        const deriveIds = (order: readonly string[]) =>
            new Map(
                order.map((discriminator) => [
                    discriminator,
                    IntentFactory.derive({
                        parent: parentA,
                        slot: 'reserve-funds',
                        discriminator,
                    }).id,
                ]),
            );

        expect(deriveIds(replayOrder)).toEqual(deriveIds(initialOrder));
        expect(derive({ discriminator: 'invoice-1' }).id).not.toBe(
            derive({ discriminator: 'invoice-2' }).id,
        );
    });

    it('changes child identity when parent or semantic slot changes', () => {
        expect(derive({ parent: parentA }).id).not.toBe(derive({ parent: parentB }).id);
        expect(derive({ slot: 'reserve-funds' }).id).not.toBe(
            derive({ slot: 'capture-funds' }).id,
        );
    });

    it('keeps the same logical child identity when replay-time Operation snapshot changes', () => {
        const firstOperationSnapshot = { amount: 100, operationType: 'ReserveFunds' };
        const replayOperationSnapshot = { amount: 200, operationType: 'CaptureFunds' };

        const first = IntentFactory.derive({
            parent: parentA,
            slot: 'apply-payment-effect',
        });
        const replay = IntentFactory.derive({
            parent: parentA,
            slot: 'apply-payment-effect',
        });

        expect(firstOperationSnapshot).not.toEqual(replayOperationSnapshot);
        expect(replay).toEqual(first);
    });

    it('supports stable Event-driven downstream UseCase derivation', () => {
        const request = {
            parent: { id: 'producing-operation-intent-id' },
            slot: 'start-order-fulfillment',
            discriminator: 'event-1',
        } as const;

        const firstDelivery = IntentFactory.derive(request);
        const redelivery = IntentFactory.derive(request);
        const differentEvent = IntentFactory.derive({ ...request, discriminator: 'event-2' });
        const differentReaction = IntentFactory.derive({ ...request, slot: 'notify-customer' });

        expect(redelivery).toEqual(firstDelivery);
        expect(differentEvent.id).not.toBe(firstDelivery.id);
        expect(differentReaction.id).not.toBe(firstDelivery.id);
        expect(firstDelivery.parent).toEqual({ id: 'producing-operation-intent-id' });
        expect(firstDelivery.derivation).toEqual({
            slot: 'start-order-fulfillment',
            discriminator: 'event-1',
        });
    });

    it('keeps CorrelationId outside derived Intent identity', () => {
        const firstContext = {
            correlationId: 'correlation-1',
            parentIntentId: 'producing-operation-intent-id',
            eventId: 'event-1',
        };
        const secondContext = { ...firstContext, correlationId: 'correlation-2' };

        const deriveFromContext = (context: typeof firstContext) =>
            IntentFactory.derive({
                parent: { id: context.parentIntentId },
                slot: 'start-order-fulfillment',
                discriminator: context.eventId,
            });

        expect(firstContext.correlationId).not.toBe(secondContext.correlationId);
        expect(deriveFromContext(firstContext)).toEqual(deriveFromContext(secondContext));
    });

    it('rejects invalid derivation inputs through the existing validation rules', () => {
        expect(() => IntentFactory.derive({ parent: { id: '' }, slot: 'reserve-funds' })).toThrow();
        expect(() => IntentFactory.derive({ parent: parentA, slot: 'Reserve Funds' })).toThrow();
        expect(() =>
            IntentFactory.derive({
                parent: parentA,
                slot: 'reserve-funds',
                discriminator: ' ',
            }),
        ).toThrow();
    });
});
