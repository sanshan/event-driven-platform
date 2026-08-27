import type { AnyTenantReference } from '@event-driven-platform/tenant-reference';

export interface RunnerObservationContext {
    readonly operation: string;
    readonly tenant: AnyTenantReference;
    readonly intentId: string;
    readonly correlationId: string;
}

export type RunnerExecutionOutcome = 'success' | 'rejected' | 'error' | 'timed-out';
export type RunnerAttemptOutcome = RunnerExecutionOutcome;

export type RunnerObservation =
    | { readonly type: 'execution.requested'; readonly context: RunnerObservationContext }
    | { readonly type: 'execution.started'; readonly context: RunnerObservationContext }
    | {
          readonly type: 'execution.completed';
          readonly context: RunnerObservationContext;
          readonly outcome: RunnerExecutionOutcome;
          readonly durationMs: number;
          readonly failureType?: string;
      }
    | { readonly type: 'idempotency.hit'; readonly context: RunnerObservationContext }
    | {
          readonly type: 'claim.rejected';
          readonly context: RunnerObservationContext;
          readonly reason: 'already-in-progress' | 'intent-conflict';
      }
    | {
          readonly type: 'attempt.started';
          readonly context: RunnerObservationContext;
          readonly attempt: number;
      }
    | {
          readonly type: 'attempt.completed';
          readonly context: RunnerObservationContext;
          readonly attempt: number;
          readonly outcome: RunnerAttemptOutcome;
          readonly retryable: boolean;
          readonly durationMs: number;
          readonly failureType?: string;
      }
    | {
          readonly type: 'retry.scheduled';
          readonly context: RunnerObservationContext;
          readonly attempt: number;
          readonly delayMs: number;
      }
    | { readonly type: 'guard.rejected'; readonly context: RunnerObservationContext }
    | { readonly type: 'rate-limit.rejected'; readonly context: RunnerObservationContext };
