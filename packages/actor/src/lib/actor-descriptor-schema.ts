import * as z from 'zod';

const actorTypeSchema = z.enum(['user', 'service', 'system', 'scheduler']);

const nonEmptyStringSchema = z
    .string()
    .min(1)
    .refine((value) => value === value.trim(), 'Must not contain leading or trailing whitespace.');

const ipAddressSchema = z.union([z.ipv4(), z.ipv6()]);

const actorOriginSchema = z.strictObject({
    ipAddress: ipAddressSchema.optional(),

    countryCode: z
        .string()
        .regex(/^[A-Z]{2}$/, 'Must be an uppercase ISO 3166-1 alpha-2 code.')
        .optional(),

    region: nonEmptyStringSchema.optional(),
    city: nonEmptyStringSchema.optional(),

    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),

    timezone: nonEmptyStringSchema.optional(),

    environment: nonEmptyStringSchema.optional(),
    host: nonEmptyStringSchema.optional(),
    instance: nonEmptyStringSchema.optional(),
});

export const actorDescriptorSchema = z.strictObject({
    type: actorTypeSchema,
    id: nonEmptyStringSchema,
    origin: actorOriginSchema,
});
