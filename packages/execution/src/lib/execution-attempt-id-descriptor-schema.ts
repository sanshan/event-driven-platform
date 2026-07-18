import * as z from 'zod';

const executionIdSchema = z
    .string()
    .min(1, 'Execution identifier must not be empty.')
    .refine(
        (value) => value === value.trim(),
        'Execution identifier must not contain leading or trailing whitespace.',
    );

export const executionAttemptIdDescriptorSchema = z.strictObject({
    executionId: executionIdSchema,

    attemptNumber: z
        .number()
        .int('Execution attempt number must be an integer.')
        .positive('Execution attempt number must be positive.')
        .safe('Execution attempt number must be a safe integer.'),
});
