import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Event } from './event.js';

interface DepositChangedV1Payload {
    readonly depositId: string;

    readonly status: 'pending' | 'approved' | 'rejected';

    readonly reason?: string;
}

type DepositChangedV1 = Event<'deposit.changed', 1, DepositChangedV1Payload>;

describe('Event', () => {
    it('describes a versioned business fact', () => {
        const event: DepositChangedV1 = {
            name: 'deposit.changed',
            schemaVersion: 1,
            payload: {
                depositId: 'deposit-1',
                status: 'approved',
            },
        };

        expect(event).toEqual({
            name: 'deposit.changed',
            schemaVersion: 1,
            payload: {
                depositId: 'deposit-1',
                status: 'approved',
            },
        });

        expectTypeOf(event.name).toEqualTypeOf<'deposit.changed'>();

        expectTypeOf(event.schemaVersion).toEqualTypeOf<1>();

        expectTypeOf(event.payload).toEqualTypeOf<DepositChangedV1Payload>();
    });
});
