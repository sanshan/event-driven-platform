import type { AnyTenantReference } from '@event-driven-platform/tenant-reference';

export interface ReaderObservationContext {
    readonly read: string;
    readonly tenant: AnyTenantReference;
}

export type ReaderOutcome = 'success' | 'error' | 'timed-out' | 'cancelled';
export type ReaderCacheScope = 'local' | 'shared';

export type ReaderObservation =
    | { readonly type: 'read.requested'; readonly context: ReaderObservationContext }
    | { readonly type: 'read.started'; readonly context: ReaderObservationContext }
    | {
          readonly type: 'read.completed';
          readonly context: ReaderObservationContext;
          readonly outcome: ReaderOutcome;
          readonly durationMs: number;
      }
    | {
          readonly type: 'cache.lookup.completed';
          readonly context: ReaderObservationContext;
          readonly scope: ReaderCacheScope;
          readonly level: number;
          readonly outcome: 'hit' | 'miss' | 'error';
          readonly durationMs: number;
      }
    | {
          readonly type: 'cache.population.completed';
          readonly context: ReaderObservationContext;
          readonly scope: ReaderCacheScope;
          readonly level: number;
          readonly outcome: 'success' | 'error';
          readonly durationMs: number;
      }
    | {
          readonly type: 'source.completed';
          readonly context: ReaderObservationContext;
          readonly outcome: 'success' | 'error';
          readonly durationMs: number;
      }
    | { readonly type: 'local-inflight.joined'; readonly context: ReaderObservationContext }
    | {
          readonly type: 'distributed-coordination.completed';
          readonly context: ReaderObservationContext;
          readonly outcome: 'owner' | 'waiter' | 'unavailable' | 'ownership-lost';
          readonly durationMs: number;
      }
    | {
          readonly type: 'read.attempt.started';
          readonly context: ReaderObservationContext;
          readonly attempt: number;
      }
    | {
          readonly type: 'read.attempt.completed';
          readonly context: ReaderObservationContext;
          readonly attempt: number;
          readonly outcome: 'success' | 'error';
          readonly retryable: boolean;
          readonly durationMs: number;
      }
    | {
          readonly type: 'read.retry.scheduled';
          readonly context: ReaderObservationContext;
          readonly attempt: number;
          readonly delayMs: number;
      };
