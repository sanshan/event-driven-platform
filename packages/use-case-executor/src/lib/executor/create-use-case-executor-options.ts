import type { UseCaseExecutorDependencies } from './use-case-executor-dependencies.js';
import type { UseCaseExecutorRuntime } from './use-case-executor-runtime.js';

export interface CreateUseCaseExecutorOptions {
    readonly dependencies: UseCaseExecutorDependencies;
    readonly runtime: UseCaseExecutorRuntime;
}
