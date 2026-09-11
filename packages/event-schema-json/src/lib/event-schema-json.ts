import type { EventContract } from '@event-driven-platform/event';
import { z } from 'zod';

export function renderEventContractJsonSchema<
    const TName extends string,
    const TSchemaVersion extends number,
    TPayloadSchema extends z.ZodType,
>(contract: EventContract<TName, TSchemaVersion, TPayloadSchema>) {
    return z.toJSONSchema(contract.payload, {
        target: 'draft-2020-12',
        unrepresentable: ({ path, message }) => {
            const location = path.length === 0 ? 'payload' : `payload/${path.join('/')}`;

            throw new Error(
                `Cannot render JSON Schema for event "${contract.name}" at ${location}: ${message}`,
            );
        },
    });
}
