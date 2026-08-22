import { z } from 'zod';

const SLOT_PATTERN = /^[a-z][a-z0-9-]*$/;

const nonEmptyStringSchema = z
    .string()
    .min(1, 'must not be empty.')
    .refine((value) => value === value.trim(), 'must not contain leading or trailing whitespace.');

export const intentDerivationRequestSchema = z.strictObject({
    parent: z.strictObject({
        id: nonEmptyStringSchema,
    }),
    slot: z.string().regex(SLOT_PATTERN, 'must use lowercase kebab-case.'),
    discriminator: nonEmptyStringSchema.optional(),
});
