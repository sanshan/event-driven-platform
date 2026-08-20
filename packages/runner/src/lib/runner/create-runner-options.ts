import type { RunnerDependencies } from './runner-dependencies.js';
import type { RunnerOptions } from './runner-options.js';
import type { RunnerRuntime } from './runner-runtime.js';

export interface CreateRunnerOptions {
    readonly dependencies: RunnerDependencies;

    readonly runtime: RunnerRuntime;

    readonly options: RunnerOptions;
}
