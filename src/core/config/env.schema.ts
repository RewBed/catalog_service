import { z } from 'zod';

const toOptionalNumber = (val: unknown) => {
    if (val === undefined || val === null || val === '') {
        return undefined;
    }

    return Number(val);
};

export const envSchema = z.object({
    SERVICE_NAME: z.string(),
    SERVICE_PORT: z.preprocess((val) => Number(val), z.number()),
    GRPC_PORT: z.preprocess((val) => Number(val), z.number()),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z.preprocess((val) => Number(val), z.number()),
    POSTGRES_DB: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),

    KAFKA_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
    KAFKA_BROKERS: z.string().default(''),
    KAFKA_CLIENT_ID: z.string().default('image-service'),
    KAFKA_SSL: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
    KAFKA_SASL_MECHANISM: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).default('plain'),
    KAFKA_USERNAME: z.string().default(''),
    KAFKA_PASSWORD: z.string().default(''),
    KAFKA_TOPIC_IMAGE_UPLOADED: z.string().default('image.uploaded'),
    KAFKA_OUTBOX_POLL_INTERVAL_MS: z.preprocess(toOptionalNumber, z.number()).default(2000),
    KAFKA_OUTBOX_BATCH_SIZE: z.preprocess(toOptionalNumber, z.number()).default(100),
    KAFKA_OUTBOX_MAX_ATTEMPTS: z.preprocess(toOptionalNumber, z.number()).default(10),
});

export type EnvConfig = z.infer<typeof envSchema>;
