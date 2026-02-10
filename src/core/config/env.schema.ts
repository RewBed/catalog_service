import { z } from 'zod';

export const envSchema = z.object({
    SERVICE_NAME: z.string(),
    SERVICE_PORT: z.preprocess((val) => Number(val), z.number()),
    GRPC_PORT: z.preprocess((val) => Number(val), z.number()),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z.preprocess((val) => Number(val), z.number()),
    POSTGRES_DB: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string()
});

export type EnvConfig = z.infer<typeof envSchema>;
