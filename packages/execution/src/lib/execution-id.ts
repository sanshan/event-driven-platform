import type { Brand } from '@event-driven-platform/types';

export type ExecutionId = Brand<string, 'ExecutionId'>;

export interface ExecutionIdFactory {
    create(intentId: string): ExecutionId;
}
