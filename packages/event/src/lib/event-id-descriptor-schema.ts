import * as z from 'zod';

const nonEmptyStringSchema = z
    .string()
    .min(1, 'must not be empty.')
    .refine((value) => value === value.trim(), 'must not contain leading or trailing whitespace.');

export const eventIdDescriptorSchema = z.strictObject({
    intentId: nonEmptyStringSchema,

    eventIndex: z
        .number()
        .int('Event index must be an integer.')
        .nonnegative('Event index must not be negative.'),

    eventName: nonEmptyStringSchema,

    schemaVersion: z
        .number()
        .int('Event schema version must be an integer.')
        .positive('Event schema version must be positive.'),
});
