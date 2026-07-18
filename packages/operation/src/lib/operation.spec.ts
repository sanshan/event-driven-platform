import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { Subject } from '@event-driven-platform/subject';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import type { Operation, OperationResultOf } from './operation.js';

type MerchantId = Brand<string, 'MerchantId'>;

type WalletId = Brand<string, 'WalletId'>;

type MerchantTenant = TenantReference<'merchant', MerchantId>;

type WalletAggregate = AggregateReference<'wallet', WalletId>;

interface CreateWalletPayload {
    readonly currency: string;
}

interface CreateWalletData {
    readonly walletId: WalletId;
}

type CreateWalletResult = SuccessfulOperationResult<CreateWalletData>;

type CreateWalletOperation = Operation<
    'CreateWallet',
    1,
    MerchantTenant,
    WalletAggregate,
    CreateWalletPayload,
    CreateWalletResult
>;

describe('Operation', () => {
    it('describes a versioned domain action over one Aggregate', () => {
        const tenant: MerchantTenant = {
            type: 'merchant',
            id: 'merchant-1' as MerchantId,
        };

        const intent: Intent = {
            id: '287e771a-8769-5c0f-84dc-765c38be8f60',
            key: [
                'wallet',
                'create',
                'v1',
                'tenantType=merchant&tenantId=merchant-1',
                'currency=EUR&userId=user-1',
            ].join(':'),
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

        const aggregate: WalletAggregate = {
            type: 'wallet',
            id: 'wallet-1' as WalletId,
        };

        const operation: CreateWalletOperation = {
            name: 'CreateWallet',
            schemaVersion: 1,
            intent,
            actor,
            tenant,
            subject,
            aggregate,
            payload: {
                currency: 'EUR',
            },
        };

        expect(operation).toEqual({
            name: 'CreateWallet',
            schemaVersion: 1,
            intent,
            actor,
            tenant: {
                type: 'merchant',
                id: 'merchant-1',
            },
            subject,
            aggregate: {
                type: 'wallet',
                id: 'wallet-1',
            },
            payload: {
                currency: 'EUR',
            },
        });

        expectTypeOf(operation.name).toEqualTypeOf<'CreateWallet'>();

        expectTypeOf(operation.schemaVersion).toEqualTypeOf<1>();

        expectTypeOf(operation.tenant).toEqualTypeOf<MerchantTenant>();

        expectTypeOf(operation.tenant.type).toEqualTypeOf<'merchant'>();

        expectTypeOf(operation.tenant.id).toEqualTypeOf<MerchantId>();

        expectTypeOf(operation.aggregate).toEqualTypeOf<WalletAggregate>();

        expectTypeOf(operation.aggregate.type).toEqualTypeOf<'wallet'>();

        expectTypeOf(operation.aggregate.id).toEqualTypeOf<WalletId>();

        expectTypeOf(operation.payload).toEqualTypeOf<CreateWalletPayload>();
    });

    it('associates the Operation with its result type', () => {
        expectTypeOf<
            OperationResultOf<CreateWalletOperation>
        >().toEqualTypeOf<CreateWalletResult>();
    });
});
