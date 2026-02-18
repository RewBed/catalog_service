import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createGlobalValidationPipe } from './common/pipes/global-validation.pipe';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    const configService = app.get(ConfigService);

    // Подключаем глобальный валидатор входящих данных.
    app.useGlobalPipes(createGlobalValidationPipe());
    app.enableShutdownHooks();

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.GRPC,
        options: {
            package: 'health',
            protoPath: join(process.cwd(), 'grpc/proto/health.proto'),
            url: `0.0.0.0:${configService.get<number>('GRPC_PORT')}`,
        },
    });

    const kafkaEnabled = configService.get<boolean>('KAFKA_ENABLED', false);
    if (kafkaEnabled) {
        const brokers = (configService.get<string>('KAFKA_BROKERS', '') || '')
            .split(',')
            .map((broker) => broker.trim())
            .filter(Boolean);
        const ssl = configService.get<boolean>('KAFKA_SSL', false);
        const saslMechanism = configService.get<'plain' | 'scram-sha-256' | 'scram-sha-512'>(
            'KAFKA_SASL_MECHANISM',
            'plain',
        );
        const username = configService.get<string>('KAFKA_USERNAME', '').trim();
        const password = configService.get<string>('KAFKA_PASSWORD', '');

        const sasl = !username
            ? undefined
            : saslMechanism === 'plain'
              ? { mechanism: 'plain' as const, username, password }
              : saslMechanism === 'scram-sha-256'
                ? { mechanism: 'scram-sha-256' as const, username, password }
                : { mechanism: 'scram-sha-512' as const, username, password };

        if (brokers.length > 0) {
            // Поднимаем транспорт для входящих Kafka-сообщений.
            app.connectMicroservice<MicroserviceOptions>({
                transport: Transport.KAFKA,
                options: {
                    client: {
                        brokers,
                        clientId: configService.get<string>('KAFKA_CLIENT_ID', 'catalog-service'),
                        ssl,
                        sasl,
                    },
                    consumer: {
                        // Для каталога используем свою consumer group.
                        groupId: `${configService.get<string>('KAFKA_CLIENT_ID', 'catalog-service')}-consumer`,
                    },
                },
            });
        }
    }

    const config = new DocumentBuilder()
        .setTitle(`${configService.get<string>('SERVICE_NAME')} API`)
        .setDescription('REST API + GRPC endpoints')
        .setVersion('1.0')
        .addServer(`http://localhost:${configService.get<number>('SERVICE_PORT')}`)
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    const fs = require('fs');
    fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

    await app.startAllMicroservices();
    await app.listen(configService.get<number>('SERVICE_PORT') || 3000);
}

bootstrap();
