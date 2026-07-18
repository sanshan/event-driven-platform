import type { CreateRunnerOptions } from './create-runner-options.js';
import { DefaultRunner } from './default-runner.js';
import type { Runner } from './runner.js';

export function createRunner(configuration: CreateRunnerOptions): Runner {
    return new DefaultRunner(
        configuration.dependencies,
        configuration.runtime,
        configuration.options,
    );
}
