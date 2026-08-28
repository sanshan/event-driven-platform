export interface UseCaseExecutorObservationContext {
    readonly intentId: string;
    readonly correlationId: string;
}

export type UseCaseExecutorObservation =
    | { readonly type: 'execution.requested'; readonly context: UseCaseExecutorObservationContext }
    | {
          readonly type: 'claim.completed';
          readonly context: UseCaseExecutorObservationContext;
          readonly outcome: 'claimed' | 'completed' | 'already-in-progress' | 'intent-conflict';
          readonly durationMs: number;
      }
    | { readonly type: 'execution.started'; readonly context: UseCaseExecutorObservationContext }
    | {
          readonly type: 'execution.completed';
          readonly context: UseCaseExecutorObservationContext;
          readonly outcome: 'success' | 'error';
          readonly durationMs: number;
      }
    | {
          readonly type: 'completion.completed';
          readonly context: UseCaseExecutorObservationContext;
          readonly outcome: 'completed' | 'rejected';
          readonly durationMs: number;
      }
    | {
          readonly type: 'release.completed';
          readonly context: UseCaseExecutorObservationContext;
          readonly outcome: 'released' | 'error';
          readonly durationMs: number;
      };
