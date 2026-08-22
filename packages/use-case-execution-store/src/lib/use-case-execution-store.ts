import type {
    ClaimUseCaseExecutionRequest,
    ClaimUseCaseExecutionResult,
} from './claim-use-case-execution.js';
import type {
    CompleteUseCaseExecutionRequest,
    CompleteUseCaseExecutionResult,
} from './complete-use-case-execution.js';
import type {
    ReleaseUseCaseExecutionRequest,
    ReleaseUseCaseExecutionResult,
} from './release-use-case-execution.js';

export interface UseCaseExecutionStore {
    claim<TResult>(request: ClaimUseCaseExecutionRequest): Promise<ClaimUseCaseExecutionResult<TResult>>;

    complete<TResult>(
        request: CompleteUseCaseExecutionRequest<TResult>,
    ): Promise<CompleteUseCaseExecutionResult>;

    release(request: ReleaseUseCaseExecutionRequest): Promise<ReleaseUseCaseExecutionResult>;
}
