import type { EventContract } from '@event-driven-platform/event';
import { z } from 'zod';

export function renderEventContractJsonSchema<
    const TName extends string,
    const TSchemaVersion extends number,
    TPayloadSchema extends z.ZodType,
>(contract: EventContract<TName, TSchemaVersion, TPayloadSchema>) {
    try {
        return z.toJSONSchema(contract.payload, {
            target: 'draft-2020-12',
            io: 'output',
            unrepresentable: 'throw',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        throw new Error(`Cannot render JSON Schema for event "${contract.name}": ${message}`);
    }
}
