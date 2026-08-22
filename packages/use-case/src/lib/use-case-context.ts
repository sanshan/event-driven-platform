import type { Intent } from '@event-driven-platform/intent';

export interface UseCaseContext {
    readonly intent: Intent;
    readonly correlationId: string;
}
