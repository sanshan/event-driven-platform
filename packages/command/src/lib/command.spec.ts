import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { Operation, OperationResultOf } from '@event-driven-platform/operation';
import type { Subject } from '@event-driven-platform/subject';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import type { Command } from './command.js';

type MerchantId = Brand<string, 'MerchantId'>;

type WalletId = Brand<string, 'WalletId'>;

type MerchantTenant = TenantReference<'merchant', MerchantId>;

type WalletAggregate = AggregateReference<'wallet', WalletId>;

interface CreateWalletPayload {
    readonly currency: string;
}

interface CreateWalletResult {
    readonly walletId: WalletId;
}

type CreateWalletOperation = Operation<
    'CreateWallet',
    1,
    MerchantTenant,
    WalletAggregate,
    CreateWalletPayload,
    CreateWalletResult
>;

type CreateWalletCommand = Command<CreateWalletOperation>;

describe('Command', () => {
    it('carries an Operation, execution context and execution options', () => {
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

        const command: CreateWalletCommand = {
            operation,
            context: {
                correlationId: 'register-user-flow-1',
            },
            options: {
                timeoutMs: 5_000,
            },
        };

        expect(command).toEqual({
            operation,
            context: {
                correlationId: 'register-user-flow-1',
            },
            options: {
                timeoutMs: 5_000,
            },
        });

        expectTypeOf(command.operation).toEqualTypeOf<CreateWalletOperation>();

        expectTypeOf(command.operation.tenant).toEqualTypeOf<MerchantTenant>();

        expectTypeOf(command.operation.aggregate).toEqualTypeOf<WalletAggregate>();

        expectTypeOf(command.context.correlationId).toEqualTypeOf<string>();

        expectTypeOf<
            OperationResultOf<typeof command.operation>
        >().toEqualTypeOf<CreateWalletResult>();
    });
});
