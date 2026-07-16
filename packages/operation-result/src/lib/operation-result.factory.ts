import type { CommittedOperationRejection } from './committed-operation-rejection.js';
import type { RolledBackOperationRejection } from './rolled-back-operation-rejection.js';
import type { SuccessfulOperationResult } from './successful-operation-result.js';

export type SuccessfulOperationResultInput<TData, TEvent> = {
    readonly events?: readonly TEvent[];
} & ([TData] extends [void]
    ? {
          readonly data?: TData;
      }
    : {
          readonly data: TData;
      });

export type CommittedOperationRejectionInput<TReason, TData, TEvent> = {
    readonly reason: TReason;
    readonly events?: readonly TEvent[];
} & ([TData] extends [void]
    ? {
          readonly data?: TData;
      }
    : {
          readonly data: TData;
      });

export type RolledBackOperationRejectionInput<TReason, TData> = {
    readonly reason: TReason;
} & ([TData] extends [void]
    ? {
          readonly data?: TData;
      }
    : {
          readonly data: TData;
      });

function success<TData = void, TEvent = never>(
    ...args: [TData] extends [void]
        ? [input?: SuccessfulOperationResultInput<TData, TEvent>]
        : [input: SuccessfulOperationResultInput<TData, TEvent>]
): SuccessfulOperationResult<TData, TEvent> {
    const input = args[0];

    return {
        status: 'success',
        data: input?.data as TData,
        events: input?.events ?? [],
    };
}

function committedRejection<TReason, TData = void, TEvent = never>(
    input: CommittedOperationRejectionInput<TReason, TData, TEvent>,
): CommittedOperationRejection<TReason, TData, TEvent> {
    return {
        status: 'rejected',
        completion: 'committed',
        reason: input.reason,
        data: input.data as TData,
        events: input.events ?? [],
    };
}

function rolledBackRejection<TReason, TData = void>(
    input: RolledBackOperationRejectionInput<TReason, TData>,
): RolledBackOperationRejection<TReason, TData> {
    return {
        status: 'rejected',
        completion: 'rolled-back',
        reason: input.reason,
        data: input.data as TData,
        events: [],
    };
}

export const OperationResults = {
    success,
    committedRejection,
    rolledBackRejection,
} as const;
