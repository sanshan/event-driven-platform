import { describe, expectTypeOf, it } from 'vitest';

import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Operation } from '@event-driven-platform/operation';
import type { OperationHandler } from '@event-driven-platform/operation-handler';
import type {
    RolledBackOperationRejection,
    SuccessfulOperationResult,
} from '@event-driven-platform/operation-result';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import type { OperationHandlerResolver } from './operation-handler-resolver.js';

type MerchantId = Brand<string, 'MerchantId'>;

type WalletId = Brand<string, 'WalletId'>;

type MerchantTenant = TenantReference<'merchant', MerchantId>;

type WalletAggregate = AggregateReference<'wallet', WalletId>;

interface CreateWalletPayload {
    readonly currency: string;
}

interface WalletCreatedEvent {
    readonly name: 'wallet.created';
    readonly schemaVersion: 1;
    readonly payload: {
        walletId: WalletId;
    };
}

type CreateWalletResult =
    | SuccessfulOperationResult<
          {
              readonly walletId: WalletId;
          },
          WalletCreatedEvent
      >
    | RolledBackOperationRejection<
          {
              readonly code: 'wallet-already-exists';
          },
          {
              readonly walletId: WalletId;
          }
      >;

type CreateWalletOperation = Operation<
    'wallet.create',
    1,
    MerchantTenant,
    WalletAggregate,
    CreateWalletPayload,
    CreateWalletResult
>;

function resolveCreateWalletHandler(
    resolver: OperationHandlerResolver,
    operation: CreateWalletOperation,
): OperationHandler<CreateWalletOperation> {
    return resolver.resolve(operation);
}

describe('OperationHandlerResolver', () => {
    it('preserves the exact Operation type in the resolved handler', () => {
        expectTypeOf(resolveCreateWalletHandler).returns.toEqualTypeOf<
            OperationHandler<CreateWalletOperation>
        >();

        expectTypeOf<ReturnType<typeof resolveCreateWalletHandler>['execute']>()
            .parameter(0)
            .toEqualTypeOf<CreateWalletOperation>();

        expectTypeOf<
            ReturnType<typeof resolveCreateWalletHandler>['execute']
        >().returns.toEqualTypeOf<Promise<CreateWalletResult>>();
    });
});
