import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { Subject } from '@event-driven-platform/subject';
import type { Brand } from '@event-driven-platform/types';

import type { Operation, OperationResultOf } from './operation.js';

type WalletId = Brand<string, 'WalletId'>;

interface CreateWalletPayload {
    readonly currency: string;
}

interface CreateWalletResult {
    readonly walletId: WalletId;
}

type CreateWalletOperation = Operation<
    'CreateWallet',
    1,
    WalletId,
    CreateWalletPayload,
    CreateWalletResult
>;

describe('Operation', () => {
    it('describes a versioned domain action over one Aggregate', () => {
        const intent: Intent = {
            id: '287e771a-8769-5c0f-84dc-765c38be8f60',
            key: 'wallet.create:v1:user-1:EUR',
        };

        const actor: Actor = {
            type: 'user',
            id: 'user-1',
            origin: {},
        };

        const subject: Subject = {
            type: 'user',
            id: 'user-1',
        };

        const aggregateId = 'wallet-1' as WalletId;

        const operation: CreateWalletOperation = {
            name: 'CreateWallet',
            schemaVersion: 1,
            intent,
            actor,
            subject,
            aggregateId,
            payload: {
                currency: 'EUR',
            },
        };

        expect(operation).toEqual({
            name: 'CreateWallet',
            schemaVersion: 1,
            intent,
            actor,
            subject,
            aggregateId: 'wallet-1',
            payload: {
                currency: 'EUR',
            },
        });

        expectTypeOf(operation.name).toEqualTypeOf<'CreateWallet'>();

        expectTypeOf(operation.schemaVersion).toEqualTypeOf<1>();

        expectTypeOf(operation.aggregateId).toEqualTypeOf<WalletId>();

        expectTypeOf(operation.payload).toEqualTypeOf<CreateWalletPayload>();
    });

    it('associates the Operation with its result type', () => {
        expectTypeOf<
            OperationResultOf<CreateWalletOperation>
        >().toEqualTypeOf<CreateWalletResult>();
    });
});
