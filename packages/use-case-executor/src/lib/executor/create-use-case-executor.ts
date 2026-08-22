import type { CreateUseCaseExecutorOptions } from './create-use-case-executor-options.js';
import { DefaultUseCaseExecutor } from './default-use-case-executor.js';
import type { UseCaseExecutor } from './use-case-executor.js';

export function createUseCaseExecutor(configuration: CreateUseCaseExecutorOptions): UseCaseExecutor {
    return new DefaultUseCaseExecutor(configuration.dependencies, configuration.runtime);
}
