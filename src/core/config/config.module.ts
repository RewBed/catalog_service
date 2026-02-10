import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema } from './env.schema';

@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            validate: (config) => {
                const result = envSchema.safeParse(config);
                if (!result.success) {
                    console.error(result.error.format());
                    throw new Error('Invalid environment variables');
                }
                return result.data;
            },
        }),
    ],
})
export class ConfigModule {}
