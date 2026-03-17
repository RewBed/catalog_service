import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createGlobalValidationPipe } from './common/pipes/global-validation.pipe';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    const configService = app.get(ConfigService);
    app.useLogger(app.get(Logger));

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
