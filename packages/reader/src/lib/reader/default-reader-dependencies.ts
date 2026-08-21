import type { ReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator';
import type { ReadHandlerResolver } from '@event-driven-platform/read-handler-resolver';

import type { ReadTimeout } from '../control/read-timeout.js';

export interface DefaultReaderDependencies {
    readonly readHandlerResolver: ReadHandlerResolver;
    readonly readTimeout?: ReadTimeout;
    readonly readExecutionCoordinator?: ReadExecutionCoordinator;
    readonly readExecutionOwnerIdFactory?: () => string;
}
