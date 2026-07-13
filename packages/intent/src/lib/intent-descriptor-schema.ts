import {z} from 'zod';

const SEGMENT_PATTERN = /^[a-z][a-z0-9-]*$/;
const COMPONENT_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

const segmentSchema = z
    .string()
    .regex(
        SEGMENT_PATTERN,
        'must use lowercase kebab-case.',
    );

const componentValueSchema = z
    .string()
    .min(1, 'must not be empty.')
    .refine(
        (value) => value === value.trim(),
        'must not contain leading or trailing whitespace.',
    );

export const intentDescriptorSchema = z
    .strictObject({
        namespace: segmentSchema,
        action: segmentSchema,
        version: z
            .number()
            .int()
            .positive(
                'Intent version must be a positive safe integer.',
            ),
        components: z.record(
            z.string(),
            componentValueSchema,
        ),
    })
    .superRefine((descriptor, context) => {
        if (Object.keys(descriptor.components).length === 0) {
            context.addIssue({
                code: 'custom',
                path: ['components'],
                message: 'Intent must contain at least one component.',
            });
        }

        for (const name of Object.keys(descriptor.components)) {
            if (!COMPONENT_NAME_PATTERN.test(name)) {
                context.addIssue({
                    code: 'custom',
                    path: ['components', name],
                    message:
                        `Intent component name "${name}" must use camelCase.`,
                });
            }
        }
    });