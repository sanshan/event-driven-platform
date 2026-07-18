import * as z from 'zod';

const nonEmptyStringSchema = z
    .string()
    .min(1)
    .refine((value) => value === value.trim(), 'Must not contain leading or trailing whitespace.');

export const aggregateReferenceDescriptorSchema = z.strictObject({
    type: nonEmptyStringSchema,
    id: nonEmptyStringSchema,
});
